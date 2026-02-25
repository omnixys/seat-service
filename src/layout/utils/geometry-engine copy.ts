/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GeometryEngine v4 — SectionInput-driven
 * ---------------------------------------
 * Jede Section beschreibt:
 *   - ihre Form
 *   - ihre Tische
 *   - ihre Sitz-Konfiguration
 *
 * Jede Section/Table legt selbst fest:
 *   - Shape
 *   - Anzahl
 *   - Meta
 *
 * Die Engine generiert daraus die genaue Positionierung.
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
  seatType?: string;
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
    const sections = await this.generateSections(
      settings.sections,
      settings.adaptiveRadius,
    );
    const tables = await this.generateTables(settings.sections, sections);
    const seats = await this.generateSeats(settings.sections, tables);

    return { sections, tables, seats };
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

  async generateSections(
    sectionInputs: any[],
    adaptive: boolean | undefined,
  ): Promise<GeometrySection[]> {
    const list: GeometrySection[] = [];

    const count = sectionInputs.length;
    const baseRadius = 600;

    for (let i = 0; i < count; i++) {
      const sec = sectionInputs[i];

      const dynamicRadius = adaptive ? this.computeDynamicRadius(sec) : 500;

      const angle = (2 * Math.PI * i) / count;

      const x = Math.cos(angle) * baseRadius;
      const y = Math.sin(angle) * baseRadius;

      list.push({
        id: `sec_${i}`,
        name: sec.name,
        x,
        y,
        radius: dynamicRadius,
        order: i + 1,
        meta: {
          shape: sec.shape,
          config: sec.meta ?? {},
        },
      });
    }

    return list;
  }

  // ---------------------------------------------------------------------------
  // TABLE GENERATION
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
        return [];
      }
      const secCfg = sectionInputs[i];

      const tables = secCfg.tables;
      const ring = this.computeTableRing(tables);

      for (let t = 0; t < tables.length; t++) {
        const tblCfg = tables[t];
        const angle = (2 * Math.PI * t) / tables.length;

        const x = sec.x + Math.cos(angle) * ring;
        const y = sec.y + Math.sin(angle) * ring;

        list.push({
          id: `tbl_${i}_${t}`,
          sectionId: sec.id,
          name: tblCfg.name ?? `${sec.name}-T${t + 1}`,
          order: t + 1,
          x,
          y,
          capacity: tblCfg.seats.count,
          meta: {
            shape: tblCfg.shape,
            config: tblCfg.meta ?? {},
            ring,
          },
        });
      }
    }

    return list;
  }

  // ---------------------------------------------------------------------------
  // SEAT GENERATION
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
      const parts = table.id.split('_'); // tbl_secIndex_tableIndex
      const secIndex = Number(parts[1]);
      const tblIndex = Number(parts[2]);

      const tblCfg = sectionInputs[secIndex].tables[tblIndex];

      const seatCount = tblCfg.seats.count;
      const seatShape = tblCfg.seats.shape;

      const ring = this.computeSeatRing(seatCount);

      for (let s = 0; s < seatCount; s++) {
        const angle = (2 * Math.PI * s) / seatCount;

        list.push({
          id: `seat_${secIndex}_${tblIndex}_${s}`,
          tableId: table.id,
          number: s + 1,
          label: `S${s + 1}`,
          x: table.x + Math.cos(angle) * ring,
          y: table.y + Math.sin(angle) * ring,
          rotation: (angle * 180) / Math.PI + 90,
          seatType: seatShape ?? 'STANDARD',
          status: 'AVAILABLE',
          meta: {
            ring,
            shape: seatShape,
          },
        });
      }
    }

    return list;
  }
}
