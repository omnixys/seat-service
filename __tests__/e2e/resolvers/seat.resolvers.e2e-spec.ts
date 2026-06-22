import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { SeatFieldsResolver } from '../../../src/seat/resolvers/seat-fields.resolver.js';
import type { SeatMutationResolver as SeatMutationResolverType } from '../../../src/seat/resolvers/seat-mutation.resolver.js';
import type { SeatQueryResolver as SeatQueryResolverType } from '../../../src/seat/resolvers/seat-query.resolver.js';
import { SeatReadService } from '../../../src/seat/services/seat-read.service.js';
import { SeatWriteService } from '../../../src/seat/services/seat-write.service.js';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

import {
  actor,
  eventId,
  guestId,
  seat,
  seatAssignmentLog,
  seatId,
  seatPayload,
  section,
  sectionId,
  table,
  tableId,
} from './resolver-test.fixtures.js';

const mockSecurity = jest as unknown as {
  unstable_mockModule: (
    moduleName: string,
    factory: () => Record<string, unknown>,
  ) => Promise<void>;
};

await mockSecurity.unstable_mockModule('@omnixys/security', () => ({
  CookieAuthGuard: class CookieAuthGuard {
    canActivate(): boolean {
      return true;
    }
  },
  CurrentUser: () => (): undefined => undefined,
  CurrentUserData: class CurrentUserData {},
  RoleGuard: class RoleGuard {},
  Roles: () => () => undefined,
}));

const { SeatMutationResolver } =
  await import('../../../src/seat/resolvers/seat-mutation.resolver.js');
const { SeatQueryResolver } =
  await import('../../../src/seat/resolvers/seat-query.resolver.js');

describe('Seat resolvers integration', () => {
  const read = {
    getSeatsBySection: jest.fn(),
    getSeatsByTable: jest.fn(),
    getSeatById: jest.fn(),
    getSeatAssignmentLogs: jest.fn(),
    getSeatsByEvent: jest.fn(),
    getSeatsByIds: jest.fn(),
    getSeatByEventAndGuest: jest.fn(),
  };
  const write = {
    createSeat: jest.fn(),
    updateSeat: jest.fn(),
    deleteSeat: jest.fn(),
    assignSeat: jest.fn(),
    unassignSeat: jest.fn(),
  };
  const prisma = {
    section: { findUnique: jest.fn() },
    table: { findUnique: jest.fn() },
  };

  let queryResolver: SeatQueryResolverType;
  let mutationResolver: SeatMutationResolverType;
  let fieldsResolver: SeatFieldsResolver;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SeatQueryResolver,
        SeatMutationResolver,
        SeatFieldsResolver,
        { provide: SeatReadService, useValue: read },
        { provide: SeatWriteService, useValue: write },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    queryResolver = moduleRef.get(SeatQueryResolver);
    mutationResolver = moduleRef.get(SeatMutationResolver);
    fieldsResolver = moduleRef.get(SeatFieldsResolver);
  });

  it('resolves seat queries', async () => {
    const payload = seat();
    const log = seatAssignmentLog();
    read.getSeatsBySection.mockResolvedValue([payload]);
    read.getSeatsByTable.mockResolvedValue([payload]);
    read.getSeatById.mockResolvedValue(payload);
    read.getSeatAssignmentLogs.mockResolvedValue([log]);
    read.getSeatsByEvent.mockResolvedValue([payload]);
    read.getSeatsByIds.mockResolvedValue([payload]);
    read.getSeatByEventAndGuest.mockResolvedValue(payload);

    await expect(queryResolver.seatsBySection(sectionId)).resolves.toEqual([
      payload,
    ]);
    await expect(queryResolver.seatsByTable(tableId)).resolves.toEqual([
      payload,
    ]);
    await expect(queryResolver.seat(seatId)).resolves.toEqual(payload);
    await expect(queryResolver.seatAssignmentLogs(eventId)).resolves.toEqual([
      log,
    ]);
    await expect(queryResolver.seats(eventId)).resolves.toEqual([payload]);
    await expect(queryResolver.getSeatList([seatId])).resolves.toEqual([
      payload,
    ]);
    await expect(
      queryResolver.getSeatByGuestAndEvent(
        { eventId, guestId },
        { ...actor, id: guestId },
      ),
    ).resolves.toEqual(payload);

    expect(read.getSeatsBySection).toHaveBeenCalledWith(sectionId);
    expect(read.getSeatsByTable).toHaveBeenCalledWith(tableId);
    expect(read.getSeatById).toHaveBeenCalledWith(seatId);
    expect(read.getSeatAssignmentLogs).toHaveBeenCalledWith(eventId);
    expect(read.getSeatsByEvent).toHaveBeenCalledWith(eventId);
    expect(read.getSeatsByIds).toHaveBeenCalledWith([seatId]);
    expect(read.getSeatByEventAndGuest).toHaveBeenCalledWith({
      eventId,
      guestId,
    });
  });

  it('resolves seat fields through Prisma', async () => {
    prisma.section.findUnique.mockResolvedValue(section());
    prisma.table.findUnique.mockResolvedValue(table());

    await expect(fieldsResolver.section(seatPayload())).resolves.toMatchObject({
      id: sectionId,
    });
    await expect(fieldsResolver.table(seatPayload())).resolves.toMatchObject({
      id: tableId,
    });
    await expect(
      fieldsResolver.table(seatPayload({ tableId: undefined })),
    ).resolves.toBeNull();
    expect(prisma.section.findUnique).toHaveBeenCalledWith({
      where: { id: sectionId },
    });
    expect(prisma.table.findUnique).toHaveBeenCalledWith({
      where: { id: tableId },
    });
  });

  it('throws when a seat section relation is missing', async () => {
    prisma.section.findUnique.mockResolvedValue(null);

    await expect(fieldsResolver.section(seatPayload())).rejects.toThrow(
      'section was not found',
    );
  });

  it('resolves seat mutations with current user id', async () => {
    const created = seat({ label: 'B1' });
    const createInput = { eventId, sectionId, tableId, label: 'B1' };
    const updateInput = { id: seatId, label: 'B2' };
    const assignInput = { seatId, guestId, note: 'guest assigned' };
    write.createSeat.mockResolvedValue(created);
    write.updateSeat.mockResolvedValue(seat(updateInput));
    write.deleteSeat.mockResolvedValue(true);
    write.assignSeat.mockResolvedValue(seat({ guestId }));
    write.unassignSeat.mockResolvedValue(seat({ guestId: null }));

    await expect(
      mutationResolver.createSeat(createInput, actor),
    ).resolves.toEqual(created);
    await expect(
      mutationResolver.updateSeat(updateInput, actor),
    ).resolves.toMatchObject(updateInput);
    await expect(mutationResolver.deleteSeat(seatId, actor)).resolves.toBe(
      true,
    );
    await expect(
      mutationResolver.assignSeat(assignInput, actor),
    ).resolves.toMatchObject({
      guestId,
    });
    await expect(
      mutationResolver.unassignSeat(seatId, actor),
    ).resolves.toMatchObject({
      guestId: null,
    });

    expect(write.createSeat).toHaveBeenCalledWith(createInput, actor.id);
    expect(write.updateSeat).toHaveBeenCalledWith(updateInput, actor.id);
    expect(write.deleteSeat).toHaveBeenCalledWith(seatId, actor.id);
    expect(write.assignSeat).toHaveBeenCalledWith(assignInput, actor.id);
    expect(write.unassignSeat).toHaveBeenCalledWith(seatId, actor.id);
  });
});
