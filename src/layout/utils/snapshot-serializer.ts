/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SeatType } from '../../prisma/generated/client.js';
import { SeatStatus } from '../../prisma/generated/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { createId } from '@paralleldrive/cuid2';

export interface SectionSnapshot {
  id: string;
  name: string;
  order: number;
  x: number;
  y: number;
  meta: any;
}

export interface TableSnapshot {
  id: string;
  sectionId: string;
  name: string;
  order: number;
  x: number;
  y: number;
  capacity: number | null;
  meta: any;
}

export interface SeatSnapshot {
  id: string;
  tableId: string;
  sectionId: string;
  number: number;
  label: string | null;
  x: number;
  y: number;
  rotation: number;
  seatType: SeatType | null;
  status: SeatStatus;
  meta: any;
}

export interface LayoutSnapshot {
  sections: SectionSnapshot[];
  tables: TableSnapshot[];
  seats: SeatSnapshot[];
}

export class SnapshotSerializer {
  constructor(private readonly prisma: PrismaService) {}

  /** Serialize current Prisma layout into a stable snapshot */
  async serializeCurrentLayout(eventId: string): Promise<LayoutSnapshot> {
    const sectionsDb = await this.prisma.section.findMany({
      where: { eventId },
    });
    const tablesDb = await this.prisma.table.findMany({ where: { eventId } });
    const seatsDb = await this.prisma.seat.findMany({ where: { eventId } });

    const sections: SectionSnapshot[] = sectionsDb.map((s) => ({
      id: s.id ?? createId(),
      name: s.name,
      order: s.order,
      x: s.x,
      y: s.y,
      meta: s.meta ?? {},
    }));

    const tables: TableSnapshot[] = tablesDb.map((t) => ({
      id: t.id ?? createId(),
      sectionId: t.sectionId,
      name: t.name,
      order: t.order,
      x: t.x,
      y: t.y,
      capacity: t.capacity,
      meta: t.meta ?? {},
    }));

    const seats: SeatSnapshot[] = seatsDb.map((s) => ({
      id: s.id ?? createId(),
      tableId: s.tableId!,
      sectionId: s.sectionId,
      number: s.number ?? 0,
      label: s.label,
      x: s.x ?? 0,
      y: s.y ?? 0,
      rotation: s.rotation ?? 0,
      seatType: s.seatType,
      status: s.status,
      meta: s.meta ?? {},
    }));

    return { sections, tables, seats };
  }

  /**
   * Normalize any snapshot data from DB:
   * - guarantee IDs
   * - guarantee seatType/status is correct enum
   * - guarantee structure
   */
  normalizeSnapshot(raw: any): LayoutSnapshot {
    if (!raw) {
      return { sections: [], tables: [], seats: [] };
    }

    const fixId = (id: any) => (typeof id === 'string' ? id : createId());

    const sections = (raw.sections ?? []).map((s: any) => ({
      id: fixId(s.id),
      name: s.name,
      order: s.order,
      x: s.x,
      y: s.y,
      meta: s.meta ?? {},
    }));

    const tables = (raw.tables ?? []).map((t: any) => ({
      id: fixId(t.id),
      sectionId: fixId(t.sectionId),
      name: t.name,
      order: t.order,
      x: t.x,
      y: t.y,
      capacity: t.capacity ?? null,
      meta: t.meta ?? {},
    }));

    const seats = (raw.seats ?? []).map((s: any) => ({
      id: fixId(s.id),
      tableId: fixId(s.tableId),
      sectionId: fixId(s.sectionId),
      number: s.number,
      label: s.label ?? null,
      x: s.x,
      y: s.y,
      rotation: s.rotation,
      seatType:
        (Object.values(SeatStatus).includes(s.seatType) ? s.seatType : null) ??
        null,
      status: Object.values(SeatStatus).includes(s.status)
        ? s.status
        : SeatStatus.AVAILABLE,
      meta: s.meta ?? {},
    }));

    return { sections, tables, seats };
  }
}
