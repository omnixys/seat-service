/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import type { SeatShape } from '../../prisma/generated/client.js';
import { SeatType } from '../../prisma/generated/client.js';
import { TraceRunner } from '@omnixys/observability-ts';

/**
 * GeometryEngine v5 — Hierarchical Coordinate System
 * --------------------------------------------------
 * - Sections are placed at absolute canvas positions (x, y = center)
 * - Table coordinates are RELATIVE to section center
 * - Seat coordinates are RELATIVE to table center
 * - Section width/height is computed from table extents
 *
 * Coordinate system:
 *   Canvas (0,0)
 *    └── Section (abs x, y = center)
 *         └── Table (rel x, y from section center)
 *              └── Seat (rel x, y from table center)
 */

export interface GeometrySection {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  order: number;
  meta?: any;
}

export interface GeometryTable {
  id: string;
  sectionId: string;
  name: string;
  x: number;
  y: number;
  order: number;
  capacity: number;
  meta?: any;
}

export interface GeometrySeat {
  id: string;
  tableId: string;
  number: number;
  label?: string;
  x: number;
  y: number;
  rotation: number;
  seatType: SeatType;
  seatShape: SeatShape;
  status?: string;
  meta?: any;
}

export interface GeometryOutput {
  sections: GeometrySection[];
  tables: GeometryTable[];
  seats: GeometrySeat[];
}

const DEFAULT_TABLE_SIZE = 100;
const SECTION_PADDING = 80;

export class GeometryEngine {
  async generate(settings: {
    sections: any[];
    adaptiveRadius?: boolean;
  }): Promise<GeometryOutput> {
    return TraceRunner.run('[SERVICE] generate', async () => {
      const sections = await this.generateSections(
        settings.sections,
        settings.adaptiveRadius,
      );

      const tables = await this.generateTables(settings.sections, sections);

      // Compute section bounds from relative table positions
      for (const sec of sections) {
        const sectionTables = tables.filter((t) => t.sectionId === sec.id);
        const bounds = this.computeSectionBounds(sectionTables);
        sec.width = bounds.width;
        sec.height = bounds.height;
      }

      const seats = await this.generateSeats(settings.sections, tables);

      return { sections, tables, seats };
    });
  }

  // ---------------------------------------------------------------------------
  // SECTION GENERATION
  // ---------------------------------------------------------------------------

  private computeDynamicRadius(sectionConfig: any): number {
    const tables = sectionConfig.tables.length;
    const maxSeats = Math.max(
      ...sectionConfig.tables.map((t: any) => t.seats.count),
    );

    const TABLE_SIZE = 100;
    const SEAT_SIZE = 36;

    const tableRing = (tables * (TABLE_SIZE + 40)) / (2 * Math.PI);
    const seatRing = (maxSeats * (SEAT_SIZE + 12)) / (2 * Math.PI);

    return Math.max(300, tableRing + seatRing + 60);
  }

  private getSectionFacing(shape: string) {
    switch (shape) {
      case 'u':
        return 'south';
      case 'horseshoe':
        return 'east';
      case 'vip':
        return 'center';
      default:
        return 'north';
    }
  }

  async generateSections(
    sectionInputs: any[],
    adaptive: boolean | undefined,
  ): Promise<GeometrySection[]> {
    return TraceRunner.run('[SERVICE] generateSections', async () => {
      const list: GeometrySection[] = [];
      const count = sectionInputs.length;

      const baseRadius = 600;

      for (let i = 0; i < count; i++) {
        const sec = sectionInputs[i];
        const dynamicRadius = adaptive ? this.computeDynamicRadius(sec) : 500;

        list.push({
          id: `sec_${i}`,
          name: sec.name,
          x: 0,
          y: 0,
          width: 400,
          height: 300,
          radius: dynamicRadius,
          order: i + 1,
          meta: {
            shape: sec.shape,
            facing: this.getSectionFacing(sec.shape),
            config: sec.meta ?? {},
          },
        });
      }

      this.placeCircle(list, baseRadius);

      return list;
    });
  }

  private placeCircle(sections: GeometrySection[], radius: number) {
    const count = sections.length;
    const cx = 0;
    const cy = 0;

    sections.forEach((sec, i) => {
      const angle = (i / count) * Math.PI * 2;
      sec.x = cx + Math.cos(angle) * radius;
      sec.y = cy + Math.sin(angle) * radius;
    });
  }

  // ---------------------------------------------------------------------------
  // SECTION BOUNDS COMPUTATION
  // ---------------------------------------------------------------------------

  private computeSectionBounds(tables: GeometryTable[]): {
    width: number;
    height: number;
  } {
    if (tables.length === 0) {
      return { width: 400, height: 300 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const tbl of tables) {
      const tw = tbl.meta?.width ?? DEFAULT_TABLE_SIZE;
      const th = tbl.meta?.height ?? DEFAULT_TABLE_SIZE;
      minX = Math.min(minX, tbl.x - tw / 2);
      minY = Math.min(minY, tbl.y - th / 2);
      maxX = Math.max(maxX, tbl.x + tw / 2);
      maxY = Math.max(maxY, tbl.y + th / 2);
    }

    return {
      width: maxX - minX + SECTION_PADDING,
      height: maxY - minY + SECTION_PADDING,
    };
  }

  // ---------------------------------------------------------------------------
  // TABLE GENERATION — positions relative to section center
  // ---------------------------------------------------------------------------

  private computeTableRing(tables: any[]): number {
    const TABLE_SIZE = 100;
    return Math.max(200, (tables.length * (TABLE_SIZE + 40)) / (2 * Math.PI));
  }

  async generateTables(
    sectionInputs: any[],
    sections: GeometrySection[],
  ): Promise<GeometryTable[]> {
    const list: GeometryTable[] = [];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (!sec) {
        continue;
      }

      const secCfg = sectionInputs[i];
      const tables = secCfg.tables;

      const positions = this.getTablePositions(tables, sec.meta.shape);

      for (let t = 0; t < tables.length; t++) {
        const tblCfg = tables[t];
        let pos = positions[t];
        if (!pos) {
          continue;
        }

        if (tblCfg.shape === 'row') {
          pos = this.offsetRowTable(sec, pos, tblCfg.seats.count * 44);
        }

        list.push({
          id: `tbl_${i}_${t}`,
          sectionId: sec.id,
          name: tblCfg.name ?? `${sec.name}-T${t + 1}`,
          order: t + 1,
          x: pos.x,
          y: pos.y,
          capacity: tblCfg.seats.count,
          meta: {
            shape: tblCfg.shape,
            config: tblCfg.meta ?? {},
            facing: sec.meta.facing,
          },
        });
      }
    }

    return list;
  }

  private getTablePositions(tables: any[], shape: string) {
    switch (shape) {
      case 'grid':
        return this.placeTablesGrid(tables);
      case 'u':
        return this.placeTablesU(tables);
      case 'horseshoe':
        return this.placeTablesHorseshoe(tables);
      case 'vip':
        return this.placeTablesVIP(tables);
      case 'circle':
      default:
        return this.placeTablesCircle(tables);
    }
  }

  private placeTablesCircle(tables: any[]) {
    const ring = this.computeTableRing(tables);

    return tables.map((_, t) => {
      const angle = (2 * Math.PI * t) / tables.length;
      return {
        x: Math.cos(angle) * ring,
        y: Math.sin(angle) * ring,
      };
    });
  }

  private placeTablesGrid(tables: any[]) {
    const cols = Math.ceil(Math.sqrt(tables.length));
    const size = 180;

    return tables.map((_, i) => ({
      x: (i % cols) * size - (cols * size) / 2,
      y: Math.floor(i / cols) * size - size,
    }));
  }

  private placeTablesU(tables: any[]) {
    const spacing = 200;
    const half = Math.ceil(tables.length / 2);

    const positions = [];

    for (let i = 0; i < half; i++) {
      positions.push({
        x: i * spacing,
        y: -spacing,
      });
    }

    for (let j = half; j < tables.length; j++) {
      positions.push({
        x: (j - half) * spacing,
        y: spacing,
      });
    }

    return positions;
  }

  private placeTablesHorseshoe(tables: any[]) {
    const spacing = 200;
    const top = Math.ceil(tables.length * 0.6);
    const bottom = tables.length - top;

    const positions = [];

    for (let i = 0; i < top; i++) {
      positions.push({
        x: i * spacing,
        y: 0,
      });
    }

    for (let j = 0; j < bottom; j++) {
      positions.push({
        x: (j + 0.5) * spacing,
        y: spacing,
      });
    }

    return positions;
  }

  private placeTablesVIP(tables: any[]) {
    const radius = 200;

    return tables.map((_, t) => {
      const angle = (2 * Math.PI * t) / tables.length;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });
  }

  private offsetRowTable(
    sec: GeometrySection,
    pos: { x: number; y: number },
    tableWidth: number,
  ) {
    const d = tableWidth / 2 + 70;

    switch (sec.meta.facing) {
      case 'south':
        return { x: pos.x, y: pos.y + d };
      case 'east':
        return { x: pos.x + d, y: pos.y };
      case 'west':
        return { x: pos.x - d, y: pos.y };
      case 'north':
      default:
        return { x: pos.x, y: pos.y - d };
    }
  }

  // ---------------------------------------------------------------------------
  // SEAT GENERATION — positions relative to table center
  // ---------------------------------------------------------------------------

  private computeSeatRing(count: number): number {
    const SEAT_SIZE = 36;
    return Math.max(60, (count * (SEAT_SIZE + 12)) / (2 * Math.PI));
  }

  async generateSeats(
    sectionInputs: any[],
    tables: GeometryTable[],
  ): Promise<GeometrySeat[]> {
    const list: GeometrySeat[] = [];

    for (const table of tables) {
      const parts = table.id.split('_');
      const secIndex = Number(parts[1]);
      const tblIndex = Number(parts[2]);

      const tblCfg = sectionInputs[secIndex].tables[tblIndex];
      const seatCount = tblCfg.seats.count;
      const seatShape = tblCfg.seats.shape;

      let positions;

      switch (seatShape) {
        case 'grid':
          positions = this.placeSeatsGridBankStyle(table, seatCount);
          break;

        case 'row':
          positions = this.placeSeatsRow(table, seatCount, table.meta.facing);
          break;

        case 'circle':
        default:
          positions = this.placeSeatsCircle(table, seatCount);
          break;
      }

      positions.forEach((p, s) => {
        list.push({
          id: `seat_${secIndex}_${tblIndex}_${s}`,
          tableId: table.id,
          number: s + 1,
          label: `S${s + 1}`,
          x: p.x,
          y: p.y,
          rotation: p.rotation ?? 0,
          seatShape,
          seatType: SeatType.STANDARD,
          status: 'AVAILABLE',
          meta: { shape: seatShape },
        });
      });
    }

    return list;
  }

  private placeSeatsCircle(_table: GeometryTable, count: number) {
    const ring = this.computeSeatRing(count);

    return Array.from({ length: count }).map((_, s) => {
      const angle = (2 * Math.PI * s) / count;
      return {
        x: Math.cos(angle) * ring,
        y: Math.sin(angle) * ring,
        rotation: (angle * 180) / Math.PI + 90,
      };
    });
  }

  private placeSeatsGridBankStyle(_table: GeometryTable, count: number) {
    const half = Math.ceil(count / 2);
    const spacing = 44;

    const seats = [];

    for (let i = 0; i < half; i++) {
      seats.push({
        x: (i - half / 2) * spacing,
        y: -60,
        rotation: 180,
      });
    }

    for (let i = half; i < count; i++) {
      const idx = i - half;
      seats.push({
        x: (idx - (count - half) / 2) * spacing,
        y: 60,
        rotation: 0,
      });
    }

    return seats;
  }

  private placeSeatsRow(_table: GeometryTable, count: number, facing: string) {
    const spacing = 44;
    const yOffset =
      facing === 'south'
        ? -50
        : facing === 'north'
          ? 50
          : facing === 'east'
            ? -50
            : 50;

    return Array.from({ length: count }).map((_, i) => ({
      x: (i - count / 2) * spacing,
      y: yOffset,
      rotation: 0,
    }));
  }
}
