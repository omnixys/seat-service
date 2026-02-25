/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { Table } from '../../../prisma/generated/client.js';
import type { ShapeOptions } from './type.js';

export const circleShape = (
  table: Table,
  count: number,
  opts: ShapeOptions = {},
) => {
  const radius = opts.radius ?? 120;
  const angleStep = (2 * Math.PI) / count;

  return Array.from({ length: count }).map((_, i) => {
    const angle = i * angleStep;

    return {
      eventId: table.eventId,
      sectionId: table.sectionId,
      tableId: table.id,
      number: i + 1,
      label: `${i + 1}`,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      rotation: (angle * 180) / Math.PI + 90,
      meta: opts.meta ?? null,
    };
  });
};
