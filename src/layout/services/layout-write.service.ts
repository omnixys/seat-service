/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { Injectable, NotFoundException } from '@nestjs/common';

import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSeatDTO } from '@omnixys/contracts';

import {
  AutoGenerateLayoutInput,
  SectionInput,
  TableConfigInput,
} from '../models/inputs/auto-generate.input.js';
import {
  MoveSeatInput,
  MoveSectionInput,
  MoveTableInput,
} from '../models/inputs/move-seat.input.js';
import { SaveLayoutVersionInput } from '../models/inputs/save-layout-version.input.js';

import {
  LayoutChangeType,
  LayoutVersion,
  SeatShape,
  SeatStatus,
  SeatType,
  SectionShape,
  TableShape,
} from '../../prisma/generated/client.js';
import { LogChangeInput } from '../models/inputs/log-change.input.js';
import { LayoutVersionMapper } from '../models/mappers/layout-version.mapper.js';
import { LayoutVersionPayload } from '../models/payloads/layout-version.payload.js';
import { GeometryEngine } from '../utils/geometry-engine.js';

import { SeatSnapshot, SnapshotSerializer } from '../utils/snapshot-serializer.js';

import { nextOrder } from '../../utils/auto-order.js';
import { prepareMeta } from '../../utils/meta-defaults.js';
import { CloneSectionInput } from '../models/inputs/clone-section.input.js';
import { DuplicateTableInput } from '../models/inputs/duplicate-Table-input.js';
import { InputJsonValue } from '@prisma/client/runtime/client';
import jsonpatch from 'fast-json-patch';

@Injectable()
export class LayoutWriteService {
  private readonly logger;
  private readonly geometry = new GeometryEngine();
  private readonly snapshot: SnapshotSerializer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerPlusService,
  ) {
    this.logger = this.loggerService.getLogger(LayoutWriteService.name);
    this.snapshot = new SnapshotSerializer(prisma);
  }

  // -------------------------------------------------------
  // VERSIONING
  // -------------------------------------------------------

  async saveLayoutVersion(
    input: SaveLayoutVersionInput,
    actorId: string,
  ): Promise<LayoutVersionPayload> {
    const { eventId } = input;

    this.logger.debug('Saving layout version for event %s (version=%s)', eventId, input.version);

    const snapshot = await this.snapshot.serializeCurrentLayout(eventId);

    this.logger.debug(
      'Snapshot generated (sections=%d tables=%d seats=%d)',
      snapshot.sections?.length ?? 0,
      snapshot.tables?.length ?? 0,
      snapshot.seats?.length ?? 0,
    );

    const created = await this.prisma.layoutVersion.create({
      data: {
        eventId,
        version: input.version,
        label: input.label ?? null,
        data: snapshot as unknown as InputJsonValue,
      },
    });

    await this.logChange({
      actorId,
      eventId,
      type: LayoutChangeType.LAYOUT_VERSION_SAVED,
      payload: { version: created.version, id: created.id },
    });

    this.logger.debug('Layout version saved (event=%s version=%d)', eventId, created.version);

    return LayoutVersionMapper.toPayload(created);
  }

  private async loadLatestVersion(eventId: string) {
    this.logger.debug('Loading latest layout version for event %s', eventId);

    const version = await this.prisma.layoutVersion.findFirst({
      where: { eventId },
      orderBy: { version: 'desc' },
    });

    if (!version) {
      this.logger.debug('No layout versions found for event %s', eventId);
    }

    return version;
  }

  async undo(eventId: string): Promise<boolean> {
    this.logger.debug('Undo requested for event %s', eventId);

    const latest = await this.loadLatestVersion(eventId);
    if (!latest) {
      this.logger.warn('Undo failed: no versions exist (event=%s)', eventId);
      return false;
    }

    const previous = await this.prisma.layoutVersion.findFirst({
      where: {
        eventId,
        version: { lt: latest.version },
      },
      orderBy: { version: 'desc' },
    });

    if (!previous) {
      this.logger.warn('Undo failed: no previous version exists (event=%s)', eventId);
      return false;
    }

    await this.restoreVersion(eventId, previous);

    this.logger.debug('Undo completed (event=%s restoredVersion=%d)', eventId, previous.version);

    return true;
  }

  async redo(eventId: string): Promise<boolean> {
    this.logger.debug('Redo requested for event %s', eventId);

    const latest = await this.loadLatestVersion(eventId);
    if (!latest) {
      this.logger.warn('Redo failed: no versions exist (event=%s)', eventId);
      return false;
    }

    const next = await this.prisma.layoutVersion.findFirst({
      where: {
        eventId,
        version: { gt: latest.version },
      },
      orderBy: { version: 'asc' },
    });

    if (!next) {
      this.logger.warn('Redo failed: no next version exists (event=%s)', eventId);
      return false;
    }

    await this.restoreVersion(eventId, next);

    this.logger.debug('Redo completed (event=%s restoredVersion=%d)', eventId, next.version);

    return true;
  }

  private async restoreVersion(eventId: string, version: LayoutVersion) {
    this.logger.debug('Restoring layout version %d for event %s', version.version, eventId);

    await this.prisma.$transaction(async (tx) => {
      await tx.seat.deleteMany({ where: { eventId } });
      await tx.table.deleteMany({ where: { eventId } });
      await tx.section.deleteMany({ where: { eventId } });

      const snap = this.snapshot.normalizeSnapshot(version.data);

      const sectionMap = new Map<string, string>();
      const tableMap = new Map<string, string>();

      /* Sections */

      for (const sec of snap.sections) {
        const created = await tx.section.create({
          data: {
            eventId,
            name: sec.name,
            order: sec.order,
            x: sec.x,
            y: sec.y,
            meta: (sec.meta ?? {}) as InputJsonValue,
          },
        });

        sectionMap.set(sec.id, created.id);
      }

      this.logger.debug('Sections restored: %d', sectionMap.size);

      /* Tables */

      for (const tbl of snap.tables) {
        const newSectionId = sectionMap.get(tbl.sectionId);
        if (!newSectionId) {
          continue;
        }

        const created = await tx.table.create({
          data: {
            eventId,
            sectionId: newSectionId,
            name: tbl.name,
            order: tbl.order,
            x: tbl.x,
            y: tbl.y,
            capacity: tbl.capacity ?? undefined,
            meta: (tbl.meta ?? {}) as InputJsonValue,
          },
        });

        tableMap.set(tbl.id, created.id);
      }

      this.logger.debug('Tables restored: %d', tableMap.size);

      /* Seats */

      const seatRows = snap.seats
        .map((s: SeatSnapshot) => {
          const newSectionId = sectionMap.get(s.sectionId);
          const newTableId = tableMap.get(s.tableId);

          if (!newSectionId || !newTableId) {
            return null;
          }

          return {
            eventId,
            sectionId: newSectionId,
            tableId: newTableId,
            number: s.number,
            label: s.label,
            x: s.x,
            y: s.y,
            rotation: s.rotation,
            seatType: s.seatType ?? SeatType.STANDARD,
            status: s.status ?? SeatStatus.AVAILABLE,
            meta: (s.meta ?? {}) as InputJsonValue,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (seatRows.length > 0) {
        await tx.seat.createMany({ data: seatRows });
      }

      this.logger.debug('Seats restored: %d', seatRows.length);
    });

    this.logger.debug(
      'Layout restoration finished (event=%s version=%d)',
      eventId,
      version.version,
    );
  }

  async logChange({ eventId, actorId, type, payload }: LogChangeInput) {
    this.logger.debug('Layout change logged (event=%s type=%s actor=%s)', eventId, type, actorId);

    return this.prisma.layoutChangeLog.create({
      data: {
        eventId,
        actorId,
        type,
        payload,
      },
    });
  }

  async autoGenerate(input: AutoGenerateLayoutInput, actorId: string) {
    this.logger.debug('generate Seat Layout automatically');
    const { eventId } = input;

    // wipe
    await this.prisma.seat.deleteMany({ where: { eventId } });
    await this.prisma.table.deleteMany({ where: { eventId } });
    await this.prisma.section.deleteMany({ where: { eventId } });

    const geometry = await this.geometry.generate({
      sections: input.sections,
      adaptiveRadius: input.adaptiveRadius,
    });

    await this.writeGeometry(eventId, geometry);

    await this.logChange({
      actorId,
      eventId,
      type: LayoutChangeType.AUTO_GENERATE_GEOMETRY_V4,
      payload: input,
    });

    await this.saveLayoutVersion(
      { eventId, version: Date.now(), label: 'AutoLayout', data: undefined },
      actorId,
    );

    return true;
  }

  async autoGenerateFromMaxSeats(input: CreateSeatDTO) {
    const { eventId, maxSeats, actorId } = input;
    const sections = this.buildAutoGenerateInputFromMaxSeats(maxSeats);

    return this.autoGenerate(
      {
        eventId,
        sections,
        adaptiveRadius: true,
      },
      actorId,
    );
  }

  // -------------------------------------------------------
  // WRITE GEOMETRY
  // -------------------------------------------------------

  private async writeGeometry(eventId: string, geometry: any) {
    const createdSections: any[] = [];

    for (const sec of geometry.sections) {
      const created = await this.prisma.section.create({
        data: {
          eventId,
          name: sec.name,
          order: sec.order ?? 1,
          x: sec.x,
          y: sec.y,
          meta: (sec.meta ?? {}) as InputJsonValue,
        },
      });

      createdSections.push({ from: sec, db: created });
    }

    const createdTables: any[] = [];

    for (const tbl of geometry.tables) {
      const secMapping = createdSections.find((s) => s.from.id === tbl.sectionId);
      if (!secMapping) {
        continue;
      }

      const created = await this.prisma.table.create({
        data: {
          eventId,
          sectionId: secMapping.db.id,
          name: tbl.name ?? 'Table',
          order: tbl.order ?? 1,
          x: tbl.x,
          y: tbl.y,
          capacity: tbl.capacity ?? undefined,
          meta: (tbl.meta ?? {}) as InputJsonValue,
        },
      });

      createdTables.push({ from: tbl, db: created });
    }

    const seatRows = [];

    for (const seat of geometry.seats) {
      const tblMapping = createdTables.find((t) => t.from.id === seat.tableId);
      if (!tblMapping) {
        continue;
      }

      const secId = tblMapping.db.sectionId;

      seatRows.push({
        eventId,
        sectionId: secId,
        tableId: tblMapping.db.id,
        number: seat.number ?? 1,
        label: seat.label ?? null,
        x: seat.x,
        y: seat.y,
        rotation: seat.rotation ?? 0,
        seatType: seat.seatType ?? SeatType.STANDARD,
        status: seat.status ?? SeatStatus.AVAILABLE,
        meta: (seat.meta ?? {}) as InputJsonValue,
      });
    }

    if (seatRows.length > 0) {
      await this.prisma.seat.createMany({ data: seatRows });
    }
  }

  // -------------------------------------------------------
  // MOVE SEAT
  // -------------------------------------------------------

  async moveSeat(input: MoveSeatInput, actorId: string) {
    const seat = await this.prisma.seat.findUnique({ where: { id: input.id } });
    if (!seat) {
      throw new NotFoundException('Seat not found.');
    }

    const before = await this.loadCurrentLayout(seat.eventId);

    const updated = await this.prisma.seat.update({
      where: { id: input.id },
      data: {
        x: input.x,
        y: input.y,
        rotation: input.rotation ?? seat.rotation,
      },
    });

    await this.logChange({
      eventId: seat.eventId,
      actorId,
      type: 'SEAT_MOVED',
      payload: input,
    });

    const after = await this.loadCurrentLayout(seat.eventId);
    const diff = jsonpatch.compare(before, after);

    await this.logDiff(seat.eventId, actorId, LayoutChangeType.SEAT_MOVED, diff);
    // await this.broadcastDiff(seat.eventId, diff);

    return updated;
  }

  async moveSection(input: MoveSectionInput, actorId: string) {
    const section = await this.prisma.section.findUnique({ where: { id: input.id } });
    if (!section) {
      throw new NotFoundException('Seat not found.');
    }

    const before = await this.loadCurrentLayout(section.eventId);

    const updated = await this.prisma.section.update({
      where: { id: input.id },
      data: {
        x: input.x,
        y: input.y,
      },
    });

    await this.logChange({
      eventId: section.eventId,
      actorId,
      type: 'SECTION_MOVED',
      payload: input,
    });

    const after = await this.loadCurrentLayout(section.eventId);
    const diff = jsonpatch.compare(before, after);

    await this.logDiff(section.eventId, actorId, LayoutChangeType.SECTION_MOVED, diff);
    // await this.broadcastDiff(section.eventId, diff);

    return updated;
  }

  async moveTable(input: MoveTableInput, actorId: string) {
    const table = await this.prisma.table.findUnique({ where: { id: input.id } });
    if (!table) {
      throw new NotFoundException('Seat not found.');
    }

    const before = await this.loadCurrentLayout(table.eventId);

    const updated = await this.prisma.table.update({
      where: { id: input.id },
      data: {
        x: input.x,
        y: input.y,
      },
    });

    await this.logChange({
      eventId: table.eventId,
      actorId,
      type: 'TABLE_MOVED',
      payload: input,
    });

    const after = await this.loadCurrentLayout(table.eventId);
    const diff = jsonpatch.compare(before, after);

    await this.logDiff(table.eventId, actorId, LayoutChangeType.TABLE_MOVED, diff);
    // await this.broadcastDiff(table.eventId, diff);

    return updated;
  }

  private async loadCurrentLayout(eventId: string) {
    const sections = await this.prisma.section.findMany({ where: { eventId } });
    const tables = await this.prisma.table.findMany({ where: { eventId } });
    const seats = await this.prisma.seat.findMany({ where: { eventId } });

    return { sections, tables, seats };
  }

  async logDiff(eventId: string, actorId: string, type: LayoutChangeType, diff: any) {
    await this.prisma.layoutChangeLog.create({
      data: { eventId, actorId, type, payload: diff },
    });
  }

  // async broadcastDiff(eventId: string, diff: any) {
  //   return withSpan(this.tracer, this.logger, 'seat.broadcastDiff', async (span) => {
  //     const sc = span.spanContext();
  //     await this.kafkaProducerService.broadcastDiff(
  //       { eventId, diff },
  //       'seat.layout-write-service',
  //       {
  //         traceId: sc.traceId,
  //         spanId: sc.spanId,
  //       },
  //     );
  //   });
  // }

  // ---------------------------------------------------------------------------
  // TABLE OPERATIONS
  // ---------------------------------------------------------------------------

  async duplicateTable(input: DuplicateTableInput, actorId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: input.tableId },
      include: { seats: true },
    });

    if (!table) {
      throw new NotFoundException('Table not found.');
    }

    const autoOrder = await nextOrder(this.prisma.table, {
      sectionId: table.sectionId,
    });

    const clone = await this.prisma.table.create({
      data: {
        eventId: table.eventId,
        sectionId: table.sectionId,
        name: `${table.name}_copy`,
        order: table.order ?? autoOrder,
        x: (table.x ?? 0) + input.offsetX,
        y: (table.y ?? 0) + input.offsetY,
        capacity: table.capacity,
        meta: prepareMeta(table.meta) as InputJsonValue,
      },
    });

    const clonedSeats = table.seats.map((s) => ({
      eventId: s.eventId,
      sectionId: s.sectionId,
      tableId: clone.id,
      number: s.number,
      label: s.label,
      x: (s.x ?? 0) + input.offsetX,
      y: (s.y ?? 0) + input.offsetY,
      rotation: s.rotation,
      seatType: s.seatType,
      status: s.status,
      meta: prepareMeta(s.meta) as InputJsonValue,
    }));

    await this.prisma.seat.createMany({ data: clonedSeats });

    await this.logChange({
      eventId: table.eventId,
      actorId,
      type: LayoutChangeType.TABLE_DUPLICATED,
      payload: { original: table.id, clone: clone.id },
    });

    await this.saveLayoutVersion(
      { eventId: table.eventId, version: Date.now(), label: 'DuplicateTable', data: undefined },
      actorId,
    );

    return clone;
  }

  // ---------------------------------------------------------------------------
  // SECTION OPERATIONS
  // ---------------------------------------------------------------------------

  async cloneSection(input: CloneSectionInput, actorId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: input.sectionId },
      include: { tables: { include: { seats: true } } },
    });

    if (!section) {
      throw new NotFoundException('Section not found.');
    }

    const autoOrder = await nextOrder(this.prisma.section, {
      eventId: section.eventId,
    });

    const secClone = await this.prisma.section.create({
      data: {
        eventId: section.eventId,
        name: `${section.name}_copy`,
        order: section.order ?? autoOrder,
        x: (section.x ?? 0) + input.offsetX,
        y: (section.y ?? 0) + input.offsetY,
        meta: prepareMeta(section.meta) as InputJsonValue,
      },
    });

    // Clone tables
    for (const tbl of section.tables) {
      const tblClone = await this.prisma.table.create({
        data: {
          eventId: section.eventId,
          sectionId: secClone.id,
          name: `${tbl.name}_copy`,
          order: tbl.order,
          x: (tbl.x ?? 0) + input.offsetX,
          y: (tbl.y ?? 0) + input.offsetY,
          capacity: tbl.capacity,
          meta: prepareMeta(tbl.meta) as InputJsonValue,
        },
      });

      // Clone seats
      const seatRows = tbl.seats.map((s) => ({
        eventId: s.eventId,
        sectionId: secClone.id,
        tableId: tblClone.id,
        number: s.number,
        label: s.label,
        x: (s.x ?? 0) + input.offsetX,
        y: (s.y ?? 0) + input.offsetY,
        rotation: s.rotation,
        seatType: s.seatType,
        status: s.status,
        meta: prepareMeta(s.meta) as InputJsonValue,
      }));

      if (seatRows.length > 0) {
        await this.prisma.seat.createMany({ data: seatRows });
      }
    }

    await this.logChange({
      actorId,
      eventId: section.eventId,
      type: LayoutChangeType.SECTION_CLONED,

      payload: { original: section.id, clone: secClone.id },
    });

    await this.saveLayoutVersion(
      { eventId: section.eventId, version: Date.now(), label: 'CloneSection', data: undefined },
      actorId,
    );

    return secClone;
  }

  async deleteSeats(input: { actorId: string; eventId: string }) {
    const { eventId, actorId } = input;

    this.logger.info('Delete Seats from Event: %s by Actor %s', eventId, actorId);

    await this.prisma.seat.deleteMany({ where: { eventId } });
    await this.prisma.table.deleteMany({ where: { eventId } });
    await this.prisma.section.deleteMany({ where: { eventId } });
    await this.prisma.seatAssignmentLog.deleteMany({ where: { eventId } });
    await this.prisma.layoutVersion.deleteMany({ where: { eventId } });
    await this.prisma.layoutChangeLog.deleteMany({ where: { eventId } });

    this.logger.debug('Seats Deleted');
  }

  /**
   * Erzeugt automatisch ein AutoGenerateLayoutInput basierend auf maxSeats.
   * - Max 10 Sitze pro Tisch
   * - Max 5 Tische pro Section
   */
  private buildAutoGenerateInputFromMaxSeats(maxSeats: number) {
    const MAX_SEATS_PER_TABLE = 10;
    const MAX_TABLES_PER_SECTION = 5;

    const totalTables = Math.ceil(maxSeats / MAX_SEATS_PER_TABLE);
    const totalSections = Math.ceil(totalTables / MAX_TABLES_PER_SECTION);

    const sections: SectionInput[] = [];

    let remainingSeats = maxSeats;
    let tableOrder = 1;
    let sectionOrder = 1;

    for (let s = 0; s < totalSections; s++) {
      const tables: TableConfigInput[] = [];

      for (let t = 0; t < MAX_TABLES_PER_SECTION; t++) {
        if (remainingSeats <= 0) {
          break;
        }

        const seatCount = Math.min(MAX_SEATS_PER_TABLE, remainingSeats);

        tables.push({
          name: `Table ${tableOrder}`,
          shape: TableShape.ROUND,
          order: tableOrder,
          seats: {
            count: seatCount,
            shape: SeatShape.CIRCLE,
            meta: {},
          },
          meta: {},
        });

        tableOrder++;
        remainingSeats -= seatCount;
      }

      sections.push({
        name: `Section ${sectionOrder}`,
        shape: SectionShape.CIRCLE,
        order: sectionOrder,
        meta: {},
        tables,
      });

      sectionOrder++;
    }

    return sections;
  }
}
