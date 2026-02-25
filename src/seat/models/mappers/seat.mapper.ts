import type { Seat } from '../../../prisma/generated/client.js';
import { n2u } from '../../../utils/null-to-undefined.js';
import type { SeatPayload } from '../payloads/seat.payload.js';

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
      x: n2u(seat.x),
      y: n2u(seat.y),
      rotation: n2u(seat.rotation),
      seatType: n2u(seat.seatType),
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
