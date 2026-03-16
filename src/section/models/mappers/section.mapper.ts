import type { Section } from '../../../prisma/generated/client.js';
import { n2u } from '../../../utils/null-to-undefined.js';
import type { SectionPayload } from '../payloads/section.payload.js';

export class SectionMapper {
  static toPayload(section: Section): SectionPayload {
    return {
      id: section.id,
      eventId: section.eventId,

      name: section.name,
      order: section.order,
      capacity: n2u(section.capacity),

      shape: section.shape,

      x: section.x,
      y: section.y,

      width: n2u(section.width),
      height: n2u(section.height),
      rotation: n2u(section.rotation),

      meta: section.meta,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    };
  }

  static toPayloadList(list: Section[]): SectionPayload[] {
    return list.map((x) => this.toPayload(x));
  }
}
