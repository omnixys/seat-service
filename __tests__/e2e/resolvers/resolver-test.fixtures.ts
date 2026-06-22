import {
  LayoutChangeType,
  SeatAssignmentAction,
  SeatShape,
  SeatStatus,
  SeatType,
  SectionShape,
  TableShape,
  type LayoutChangeLog,
  type LayoutVersion,
  type Seat,
  type SeatAssignmentLog,
  type Section,
  type Table,
} from '../../../src/prisma/generated/client.js';
import type { SeatPayload } from '../../../src/seat/models/payloads/seat.payload.js';
import type { SectionPayload } from '../../../src/section/models/payloads/section.payload.js';
import type { TablePayload } from '../../../src/table/models/payloads/table.payload.js';
import type { CurrentUserData } from '@omnixys/security';

export const actor: CurrentUserData = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'resolver-test',
  firstName: 'Resolver',
  lastName: 'Test',
  email: 'resolver-test@omnixys.local',
  role: undefined,
  raw: {} as CurrentUserData['raw'],
};
export const eventId = '22222222-2222-2222-2222-222222222222';
export const sectionId = '33333333-3333-3333-3333-333333333333';
export const tableId = '44444444-4444-4444-4444-444444444444';
export const seatId = '55555555-5555-5555-5555-555555555555';
export const guestId = '66666666-6666-6666-6666-666666666666';

const now = new Date('2026-04-30T00:00:00.000Z');

export function section(overrides: Partial<Section> = {}): Section {
  return {
    id: sectionId,
    eventId,
    name: 'Main',
    order: 1,
    capacity: 100,
    shape: SectionShape.RECTANGLE,
    x: 10,
    y: 20,
    width: null,
    height: null,
    rotation: 0,
    meta: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function sectionPayload(
  overrides: Partial<SectionPayload> = {},
): SectionPayload {
  const model = section();

  return {
    id: model.id,
    eventId: model.eventId,
    name: model.name,
    order: model.order,
    capacity: model.capacity ?? undefined,
    shape: model.shape,
    x: model.x,
    y: model.y,
    width: model.width ?? undefined,
    height: model.height ?? undefined,
    rotation: model.rotation ?? undefined,
    meta: model.meta,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    ...overrides,
  };
}

export function table(overrides: Partial<Table> = {}): Table {
  return {
    id: tableId,
    eventId,
    sectionId,
    name: 'Table 1',
    order: 1,
    capacity: 8,
    shape: TableShape.ROUND,
    x: 30,
    y: 40,
    rotation: 0,
    meta: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function tablePayload(
  overrides: Partial<TablePayload> = {},
): TablePayload {
  const model = table();

  return {
    id: model.id,
    eventId: model.eventId,
    sectionId: model.sectionId,
    name: model.name,
    order: model.order,
    capacity: model.capacity ?? undefined,
    shape: model.shape,
    x: model.x,
    y: model.y,
    rotation: model.rotation ?? undefined,
    meta: model.meta,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    ...overrides,
  };
}

export function seat(overrides: Partial<Seat> = {}): Seat {
  return {
    id: seatId,
    status: SeatStatus.AVAILABLE,
    eventId,
    sectionId,
    tableId,
    number: 1,
    label: 'A1',
    note: null,
    seatType: SeatType.STANDARD,
    shape: SeatShape.CIRCLE,
    x: 50,
    y: 60,
    width: null,
    height: null,
    radius: null,
    rotation: 0,
    zIndex: 0,
    locked: false,
    hidden: false,
    guestId: null,
    invitationId: null,
    meta: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function seatPayload(overrides: Partial<SeatPayload> = {}): SeatPayload {
  const model = seat();

  return {
    id: model.id,
    status: model.status,
    eventId: model.eventId,
    sectionId: model.sectionId,
    tableId: model.tableId ?? undefined,
    number: model.number ?? undefined,
    label: model.label ?? undefined,
    note: model.note ?? undefined,
    seatType: model.seatType ?? undefined,
    shape: model.shape,
    x: model.x ?? undefined,
    y: model.y ?? undefined,
    width: model.width ?? undefined,
    height: model.height ?? undefined,
    radius: model.radius ?? undefined,
    rotation: model.rotation ?? undefined,
    zIndex: model.zIndex ?? undefined,
    locked: model.locked,
    hidden: model.hidden,
    guestId: model.guestId ?? undefined,
    invitationId: model.invitationId ?? undefined,
    meta: model.meta,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    ...overrides,
  };
}

export function seatAssignmentLog(
  overrides: Partial<SeatAssignmentLog> = {},
): SeatAssignmentLog {
  return {
    id: '77777777-7777-7777-7777-777777777777',
    eventId,
    seatId,
    guestId,
    invitationId: null,
    action: SeatAssignmentAction.ASSIGNED,
    data: {},
    createdAt: now,
    ...overrides,
  };
}

export function layoutVersion(
  overrides: Partial<LayoutVersion> = {},
): LayoutVersion {
  return {
    id: '88888888-8888-8888-8888-888888888888',
    eventId,
    version: 1n,
    label: 'Initial',
    data: { sections: [] },
    patch: null,
    inversePatch: null,
    createdAt: now,
    ...overrides,
  };
}

export function layoutChangeLog(
  overrides: Partial<LayoutChangeLog> = {},
): LayoutChangeLog {
  return {
    id: '99999999-9999-9999-9999-999999999999',
    eventId,
    actorId: actor.id,
    type: LayoutChangeType.SEAT_MOVED,
    payload: {},
    createdAt: now,
    ...overrides,
  };
}
