/* eslint-disable @typescript-eslint/explicit-function-return-type */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { Table } from '../../../prisma/generated/client.js';
import type { ShapeOptions } from './type.js';

export const uShape = (
  table: Table,
  count: number,
  opts: ShapeOptions = {},
) => {
  const width = opts.width ?? 300;
  const height = opts.height ?? 200;
  const spacing = opts.spacing ?? 50;

  const seats = [];
  let index = 1;

  // bottom row
  for (let x = -width / 2; x <= width / 2 && index <= count; x += spacing) {
    seats.push({
      eventId: table.eventId,
      sectionId: table.sectionId,
      tableId: table.id,
      label: `${index}`,
      number: index++,
      x,
      y: height / 2,
      rotation: 0,
      meta: opts.meta ?? null,
    });
  }

  // left side
  for (let y = height / 2; y >= -height / 2 && index <= count; y -= spacing) {
    seats.push({
      eventId: table.eventId,
      sectionId: table.sectionId,
      tableId: table.id,
      label: `${index}`,
      number: index++,
      x: -width / 2,
      y,
      rotation: 0,
      meta: opts.meta ?? null,
    });
  }

  // right side
  for (let y = height / 2; y >= -height / 2 && index <= count; y -= spacing) {
    seats.push({
      eventId: table.eventId,
      sectionId: table.sectionId,
      tableId: table.id,
      label: `${index}`,
      number: index++,
      x: width / 2,
      y,
      rotation: 0,
      meta: opts.meta ?? null,
    });
  }

  return seats;
};
