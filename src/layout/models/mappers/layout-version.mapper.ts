/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import type { LayoutVersion } from '../../../prisma/generated/client.js';
import type { LayoutVersionPayload } from '../payloads/layout-version.payload.js';

export class LayoutVersionMapper {
  static toPayload(v: LayoutVersion): LayoutVersionPayload {
    return {
      id: v.id,
      eventId: v.eventId,
      version: Number(v.version),
      label: v.label ? v.label : undefined,
      data: v.data,
      createdAt: v.createdAt,
    };
  }

  static toPayloadList(list: LayoutVersion[]): LayoutVersionPayload[] {
    return list.map((x) => this.toPayload(x));
  }
}
