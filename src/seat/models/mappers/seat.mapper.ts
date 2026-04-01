import type { Seat } from '../../../prisma/generated/client.js';
import type { SeatPayload } from '../payloads/seat.payload.js';
import { n2u } from '@omnixys/shared';

export class SeatMapper {
  static toPayload(seat: Seat): SeatPayload {
    return {
      id: seat.id,
      status: seat.status,

      eventId: seat.eventId,
      sectionId: seat.sectionId,
      tableId: n2u(seat.tableId),

      number: n2u(seat.number),
      label: n2u(seat.label),
      note: n2u(seat.note),

      seatType: n2u(seat.seatType),
      shape: seat.shape,

      x: n2u(seat.x),
      y: n2u(seat.y),

      width: n2u(seat.width),
      height: n2u(seat.height),

      radius: n2u(seat.radius),
      rotation: n2u(seat.rotation),

      zIndex: n2u(seat.zIndex),
      locked: seat.locked,
      hidden: seat.hidden,

      guestId: n2u(seat.guestId),
      invitationId: n2u(seat.invitationId),

      meta: seat.meta,
      createdAt: seat.createdAt,
      updatedAt: seat.updatedAt,
    };
  }

  static toPayloadList(list: Seat[]): SeatPayload[] {
    return list.map((x) => this.toPayload(x));
  }
}
