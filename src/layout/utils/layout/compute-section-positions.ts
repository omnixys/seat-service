/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/seat/utils/layout/compute-section-positions.ts

export function computeSectionPositions(sections: number, opts: any = {}) {
  const radius = opts.radius ?? 600;
  const angleStep = (2 * Math.PI) / sections;

  return Array.from({ length: sections }).map((_, i) => {
    const angle = i * angleStep;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      angle,
    };
  });
}
