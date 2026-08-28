import { AuthenticationHandler } from '../../dist/handlers/authentication.handler.js';
import { SeatStatus } from '../../dist/prisma/generated/client.js';
import {
  SeatHolderConflictException,
  SeatUnavailableException,
  SeatVerificationTokenException,
} from '../../dist/seat/errors/seat-domain.error.js';
import { SeatWriteService } from '../../dist/seat/services/seat-write.service.js';
import { SeatEventRoleResolver } from '../../dist/seat/services/seat-event-role-resolver.service.js';
import { ContextAccessor } from '@omnixys/context';
import { EventPermissionKey, EventRoleType } from '@omnixys/contracts';
import { KafkaTopics } from '@omnixys/kafka';
import assert from 'node:assert/strict';
import test from 'node:test';

const logger = {
  log() {
    return {
      debug() {},
      info() {},
      warn() {},
      error() {},
    };
  },
};

function seat(overrides = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    eventId: '00000000-0000-4000-8000-000000000002',
    sectionId: '00000000-0000-4000-8000-000000000003',
    tableId: null,
    status: SeatStatus.AVAILABLE,
    guestId: null,
    invitationId: null,
    note: null,
    createdAt: new Date('2026-06-22T10:00:00.000Z'),
    ...overrides,
  };
}

test('automatic assignment stays within the event and claims with compare-and-set', async () => {
  const available = seat();
  const assigned = seat({
    status: SeatStatus.ASSIGNED,
    guestId: '00000000-0000-4000-8000-000000000004',
    invitationId: '00000000-0000-4000-8000-000000000005',
  });
  const queries = [];
  const service = new SeatWriteService(
    {
      async $transaction(work) {
        return work({
          seat: {
            async findFirst(args) {
              queries.push(args);
              return args.where.status === SeatStatus.AVAILABLE
                ? available
                : null;
            },
            async updateMany(args) {
              assert.equal(args.where.eventId, available.eventId);
              assert.equal(args.where.status, SeatStatus.AVAILABLE);
              return { count: 1 };
            },
            async findUnique() {
              return assigned;
            },
          },
          seatAssignmentLog: { async create() {} },
          analyticsOutbox: { async create() {} },
        });
      },
    },
    logger,
    { async logChange() {} },
    { async enqueue() {} },
  );

  const result = await service.assignSeatToGuest({
    eventId: available.eventId,
    guestId: assigned.guestId,
    invitationId: assigned.invitationId,
    actorId: '00000000-0000-4000-8000-000000000006',
  });

  assert.equal(result.id, available.id);
  assert.equal(queries[1].where.eventId, available.eventId);
  assert.equal(queries[1].where.status, SeatStatus.AVAILABLE);
});

test('assignment races fail with canonical diagnostics', async () => {
  const available = seat();
  const service = new SeatWriteService(
    {
      async $transaction(work) {
        return work({
          seat: {
            async findFirst(args) {
              return args.where.status === SeatStatus.AVAILABLE
                ? available
                : null;
            },
            async updateMany() {
              return { count: 0 };
            },
          },
        });
      },
    },
    logger,
    {},
    {},
  );

  await ContextAccessor.run({ requestId: 'request-race' }, async () => {
    await assert.rejects(
      service.assignSeatToGuest({
        eventId: available.eventId,
        guestId: '00000000-0000-4000-8000-000000000004',
        invitationId: '00000000-0000-4000-8000-000000000005',
        actorId: '00000000-0000-4000-8000-000000000006',
      }),
      (error) => {
        assert.ok(error instanceof SeatUnavailableException);
        assert.equal(error.requestId, 'request-race');
        return true;
      },
    );
  });
});

test('direct invitation assignment refuses to overwrite a concurrently occupied seat', async () => {
  const target = seat();
  const service = new SeatWriteService(
    {
      async $transaction(work) {
        return work({
          seat: {
            async findUnique() {
              return target;
            },
            async findMany() {
              return [];
            },
            async updateMany() {
              return { count: 0 };
            },
          },
        });
      },
    },
    logger,
    {},
    {},
  );

  await assert.rejects(
    service.assignSeat(
      {
        seatId: target.id,
        invitationId: '00000000-0000-4000-8000-000000000007',
      },
      '00000000-0000-4000-8000-000000000006',
    ),
    SeatUnavailableException,
  );
});

test('direct assignment accepts exactly one holder', async () => {
  const service = new SeatWriteService({}, logger, {}, {});

  await assert.rejects(
    service.assignSeat(
      {
        seatId: '00000000-0000-4000-8000-000000000001',
        guestId: '00000000-0000-4000-8000-000000000004',
        invitationId: '00000000-0000-4000-8000-000000000005',
      },
      '00000000-0000-4000-8000-000000000006',
    ),
    SeatHolderConflictException,
  );
});

test('seat permission resolver prefers access projection over legacy roles', async () => {
  const resolver = new SeatEventRoleResolver({
    eventAccessProjection: {
      async findUnique() {
        return {
          permissions: [EventPermissionKey.ViewSeats, 'unknown.permission'],
        };
      },
    },
    eventRoleProjection: {
      async findUnique() {
        throw new Error('legacy fallback must not be used when access projection exists');
      },
    },
  });

  assert.deepEqual(await resolver.getPermissionsForUser('user-1', 'event-1'), [
    EventPermissionKey.ViewSeats,
  ]);
});

test('seat permission resolver treats empty access projection as immediate access removal', async () => {
  const resolver = new SeatEventRoleResolver({
    eventAccessProjection: {
      async findUnique() {
        return { permissions: [] };
      },
    },
    eventRoleProjection: {
      async findUnique() {
        return { role: EventRoleType.ADMIN };
      },
    },
  });

  assert.deepEqual(await resolver.getPermissionsForUser('user-1', 'event-1'), []);
});

test('seat permission resolver keeps legacy SUPPORT fallback compatible', async () => {
  const resolver = new SeatEventRoleResolver({
    eventAccessProjection: {
      async findUnique() {
        return null;
      },
    },
    eventRoleProjection: {
      async findUnique() {
        return { role: EventRoleType.SUPPORT };
      },
    },
  });

  const permissions = await resolver.getPermissionsForUser('user-1', 'event-1');
  assert.ok(permissions.includes(EventPermissionKey.ViewSupport));
  assert.equal(permissions.includes(EventPermissionKey.ViewSeats), false);
});

test('guest handler validates state and propagates canonical Kafka metadata', async () => {
  const events = [];
  const cacheValues = new Map([
    [
      'seat-key',
      JSON.stringify({
        eventId: '00000000-0000-4000-8000-000000000002',
        actorId: '00000000-0000-4000-8000-000000000006',
        assignments: [
          {
            invitationId: '00000000-0000-4000-8000-000000000005',
            seatId: '00000000-0000-4000-8000-000000000001',
          },
        ],
      }),
    ],
  ]);
  const handler = new AuthenticationHandler(
    logger,
    {
      async assignSeatToGuest() {
        return seat();
      },
    },
    {
      async get(_key, token) {
        return cacheValues.get(token) ?? null;
      },
      async set() {
        return 'ticket-key';
      },
    },
    {
      decrypt() {
        return JSON.stringify({ seatKey: 'seat-key' });
      },
    },
    {
      async send(event) {
        events.push(event);
      },
    },
  );

  await ContextAccessor.run(
    { requestId: 'request-handler', tenantId: 'tenant-1' },
    () =>
      handler.handleAddGuest({
        token: 'encrypted',
        invitationId: '00000000-0000-4000-8000-000000000005',
        userId: '00000000-0000-4000-8000-000000000004',
      }),
  );

  assert.equal(events[0].topic, KafkaTopics.ticket.create);
  assert.equal(events[0].meta.tenantId, 'tenant-1');
  assert.equal(events[0].payload.token, 'ticket-key');
});

test('guest handler rejects missing verification state', async () => {
  const handler = new AuthenticationHandler(
    logger,
    {},
    {
      async get() {
        return null;
      },
    },
    {
      decrypt() {
        return JSON.stringify({ seatKey: 'expired' });
      },
    },
    {},
  );

  await assert.rejects(
    handler.handleAddGuest({
      token: 'encrypted',
      invitationId: '00000000-0000-4000-8000-000000000005',
      userId: '00000000-0000-4000-8000-000000000004',
    }),
    SeatVerificationTokenException,
  );
});

test('seat permission resolver denies ViewSeats when neither access nor role projection exists', async () => {
  const resolver = new SeatEventRoleResolver({
    eventAccessProjection: {
      async findUnique() {
        return null;
      },
    },
    eventRoleProjection: {
      async findUnique() {
        return null;
      },
    },
  });

  const permissions = await resolver.getPermissionsForUser('user-1', 'event-1');
  assert.equal(permissions.includes(EventPermissionKey.ViewSeats), false);
  assert.deepEqual(permissions, []);
});
