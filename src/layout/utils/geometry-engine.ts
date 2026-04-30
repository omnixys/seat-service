/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import type { SeatShape } from '../../prisma/generated/client.js';
import { SeatType } from '../../prisma/generated/client.js';
import { TraceRunner } from '@omnixys/observability';

/**
 * GeometryEngine v4 — SectionInput-driven
 * ---------------------------------------
 * - Sections werden IMMER im Kreis angeordnet (default)
 * - section.shape beeinflusst NICHT die globale Position,
 *   sondern NUR das interne Table-Layout innerhalb der Section!
 */

export interface GeometrySection {
  id: string;
  name: string;
  x: number;
  y: number;
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

export class GeometryEngine {
  /**
   * Entry point — erstellt Sections → Tables → Seats
   */
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

      // Create Section Models
      for (let i = 0; i < count; i++) {
        const sec = sectionInputs[i];
        const dynamicRadius = adaptive ? this.computeDynamicRadius(sec) : 500;

        list.push({
          id: `sec_${i}`,
          name: sec.name,
          x: 0,
          y: 0,
          radius: dynamicRadius,
          order: i + 1,
          meta: {
            shape: sec.shape,
            facing: this.getSectionFacing(sec.shape),
            config: sec.meta ?? {},
          },
        });
      }

      // Global default: ALL SECTIONS IN A CIRCLE
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
  // TABLE GENERATION — FORM-BASED
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

      // Table Placement depends on section.shape
      const positions = this.getTablePositions(sec, tables, sec.meta.shape);

      for (let t = 0; t < tables.length; t++) {
        const tblCfg = tables[t];
        let pos = positions[t];
        if (!pos) {
          continue;
        }

        // ROW tables: table must be in front of the seats
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

  private getTablePositions(
    sec: GeometrySection,
    tables: any[],
    shape: string,
  ) {
    switch (shape) {
      case 'grid':
        return this.placeTablesGrid(sec, tables);
      case 'u':
        return this.placeTablesU(sec, tables);
      case 'horseshoe':
        return this.placeTablesHorseshoe(sec, tables);
      case 'vip':
        return this.placeTablesVIP(sec, tables);
      case 'circle':
      default:
        return this.placeTablesCircle(sec, tables);
    }
  }

  private placeTablesCircle(sec: GeometrySection, tables: any[]) {
    const ring = this.computeTableRing(tables);

    return tables.map((_, t) => {
      const angle = (2 * Math.PI * t) / tables.length;
      return {
        x: sec.x + Math.cos(angle) * ring,
        y: sec.y + Math.sin(angle) * ring,
      };
    });
  }

  private placeTablesGrid(sec: GeometrySection, tables: any[]) {
    const cols = Math.ceil(Math.sqrt(tables.length));
    const size = 180;

    return tables.map((_, i) => ({
      x: sec.x + (i % cols) * size - (cols * size) / 2,
      y: sec.y + Math.floor(i / cols) * size - size,
    }));
  }

  private placeTablesU(sec: GeometrySection, tables: any[]) {
    const spacing = 200;
    const half = Math.ceil(tables.length / 2);

    const positions = [];

    for (let i = 0; i < half; i++) {
      positions.push({
        x: sec.x + i * spacing,
        y: sec.y - spacing,
      });
    }

    for (let j = half; j < tables.length; j++) {
      positions.push({
        x: sec.x + (j - half) * spacing,
        y: sec.y + spacing,
      });
    }

    return positions;
  }

  private placeTablesHorseshoe(sec: GeometrySection, tables: any[]) {
    const spacing = 200;
    const top = Math.ceil(tables.length * 0.6);
    const bottom = tables.length - top;

    const positions = [];

    for (let i = 0; i < top; i++) {
      positions.push({
        x: sec.x + i * spacing,
        y: sec.y,
      });
    }

    for (let j = 0; j < bottom; j++) {
      positions.push({
        x: sec.x + (j + 0.5) * spacing,
        y: sec.y + spacing,
      });
    }

    return positions;
  }

  private placeTablesVIP(sec: GeometrySection, tables: any[]) {
    const radius = 200;

    return tables.map((_, t) => {
      const angle = (2 * Math.PI * t) / tables.length;
      return {
        x: sec.x + Math.cos(angle) * radius,
        y: sec.y + Math.sin(angle) * radius,
      };
    });
  }

  private offsetRowTable(
    sec: GeometrySection,
    pos: {
      x: number;
      y: number;
    },
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
  // SEAT GENERATION — stays the same (circle around each table)
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

  private placeSeatsCircle(table: GeometryTable, count: number) {
    const ring = this.computeSeatRing(count);

    return Array.from({ length: count }).map((_, s) => {
      const angle = (2 * Math.PI * s) / count;
      return {
        x: table.x + Math.cos(angle) * ring,
        y: table.y + Math.sin(angle) * ring,
        rotation: (angle * 180) / Math.PI + 90,
      };
    });
  }

  private placeSeatsGridBankStyle(table: GeometryTable, count: number) {
    const half = Math.ceil(count / 2);
    const spacing = 44;

    const seats = [];

    // obere Reihe
    for (let i = 0; i < half; i++) {
      seats.push({
        x: table.x + (i - half / 2) * spacing,
        y: table.y - 60,
        rotation: 180,
      });
    }

    // untere Reihe
    for (let i = half; i < count; i++) {
      const idx = i - half;
      seats.push({
        x: table.x + (idx - (count - half) / 2) * spacing,
        y: table.y + 60,
        rotation: 0,
      });
    }

    return seats;
  }

  // private placeSeatsGrid(table: GeometryTable, count: number) {
  //   const cols = Math.ceil(Math.sqrt(count));
  //   const rows = Math.ceil(count / cols);
  //   const spacing = 38;

  //   const offsetX = (cols - 1) * spacing * 0.5;
  //   const offsetY = (rows - 1) * spacing * 0.5;

  //   const seats = [];
  //   for (let r = 0; r < rows; r++) {
  //     for (let c = 0; c < cols; c++) {
  //       const idx = r * cols + c;
  //       if (idx >= count) {
  //         break;
  //       }

  //       seats.push({
  //         x: table.x + c * spacing - offsetX,
  //         y: table.y + r * spacing - offsetY,
  //         rotation: 0,
  //       });
  //     }
  //   }
  //   return seats;
  // }

  private placeSeatsRow(table: GeometryTable, count: number, facing: string) {
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
      x: table.x + (i - count / 2) * spacing,
      y: table.y + yOffset,
      rotation: 0,
    }));
  }
}
