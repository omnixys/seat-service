/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// src/seat/utils/layout/compute-table-positions.ts
export function computeTablePositions(tableCount: number, opts: any = {}) {
  const radius = opts.radius ?? 300;
  const angleStep = (2 * Math.PI) / tableCount;

  return Array.from({ length: tableCount }).map((_, i) => {
    const angle = i * angleStep;

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      angle,
    };
  });
}
