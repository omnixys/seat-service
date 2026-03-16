import type { Table } from '../../../prisma/generated/client.js';
import { n2u } from '../../../utils/null-to-undefined.js';
import type { TablePayload } from '../payloads/table.payload.js';

export class TableMapper {
  static toPayload(table: Table): TablePayload {
    return {
      id: table.id,
      eventId: table.eventId,
      sectionId: table.sectionId,

      name: table.name,
      order: table.order,
      capacity: n2u(table.capacity),

      shape: table.shape,

      x: table.x,
      y: table.y,

      rotation: n2u(table.rotation),
      meta: table.meta,

      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    };
  }

  static toPayloadList(list: Table[]): TablePayload[] {
    return list.map((x) => this.toPayload(x));
  }
}
