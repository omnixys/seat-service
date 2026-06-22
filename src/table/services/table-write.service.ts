/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* ---------------------------------------------------------------------------
 * SECTION MUTATIONS
 * - Creates, updates and deletes logical seat areas (“Sections”)
 * - Applies meta defaults (deep merged)
 * - Applies auto-order (only-if-missing)
 * ------------------------------------------------------------------------- */

import { LayoutWriteService } from '../../layout/services/layout-write.service.js';
import { LayoutChangeType } from '../../prisma/generated/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  SeatingConflictException,
  SeatingEntityNotFoundException,
} from '../../seat/errors/seat-domain.error.js';
import { RenameConflict, RenamePayload } from '../../section/models/payloads/rename.payload.js';
import { nextOrder } from '../../utils/auto-order.js';
import { prepareMeta } from '../../utils/meta-defaults.js';
import { CreateTableInput } from '../models/inputs/create-table.input.js';
import { RenameTableInput } from '../models/inputs/rename-table.input.js';
import { UpdateTableInput } from '../models/inputs/update-table.input.js';
import { Injectable } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger';
import { InputJsonValue } from '@prisma/client/runtime/client';

@Injectable()
export class TableWriteService {
  private readonly logger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly omnixysLogger: OmnixysLogger,
    private readonly layoutWriteService: LayoutWriteService,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name);
  }

  // ---------------------------------------------------------------------------
  // TABLE CREATE
  // ---------------------------------------------------------------------------
  /**
   * Creates a new table inside a section.
   * Applies:
   *  - Auto-ordering if no input.order provided
   *  - Deep-merged default metadata
   */
  async createTable(input: CreateTableInput, actorId: string) {
    // Compute next order ONLY if missing
    const autoOrder = await nextOrder(this.prisma.table, {
      sectionId: input.sectionId,
    });

    const created = await this.prisma.table.create({
      data: {
        eventId: input.eventId,
        sectionId: input.sectionId,
        name: input.name,
        order: input.order ?? autoOrder,
        capacity: input.capacity ?? null,
        meta: prepareMeta(input.meta) as InputJsonValue,
      },
    });

    await this.layoutWriteService.logChange({
      eventId: input.eventId,
      actorId,
      type: 'TABLE_CREATE',
      payload: created,
    });

    return created;
  }

  /* ---------------------------------------------------------------------------
   * TABLE MUTATIONS
   * - Creates, updates and deletes Tables belonging to a Section
   * - Auto-ordering (option B)
   * - Deep-merged meta defaults
   * - Prisma JSON-safe assignments
   * ------------------------------------------------------------------------- */

  // ---------------------------------------------------------------------------
  // TABLE UPDATE
  // ---------------------------------------------------------------------------
  /**
   * Updates table attributes:
   *  - Name, order, capacity, meta
   *  - Meta is deep merged if provided
   */
  async updateTable(input: UpdateTableInput, actorId: string) {
    const exists = await this.prisma.table.findUnique({
      where: { id: input.id },
    });

    if (!exists) {
      throw new SeatingEntityNotFoundException('table', input.id);
    }

    const updated = await this.prisma.table.update({
      where: { id: input.id },
      data: {
        name: input.name ?? undefined,
        order: input.order ?? undefined,
        capacity: input.capacity ?? undefined,
        meta: input.meta ? (prepareMeta(input.meta) as InputJsonValue) : undefined,
      },
    });

    await this.layoutWriteService.logChange({
      eventId: exists.eventId,
      actorId,
      type: 'TABLE_UPDATE',
      payload: input,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // TABLE DELETE
  // ---------------------------------------------------------------------------
  /**
   * Deletes a table and all related seats (cascade).
   */
  async deleteTable(tableId: string, actorId: string) {
    this.logger.debug('delete table: tableId: %s', tableId);
    const exists = await this.prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!exists) {
      throw new SeatingEntityNotFoundException('table', tableId);
    }

    await this.prisma.table.delete({
      where: { id: tableId },
    });

    await this.layoutWriteService.logChange({
      eventId: exists.eventId,
      actorId,
      type: 'TABLE_DELETE',
      payload: { id: tableId },
    });

    return true;
  }

  async renameTable(input: RenameTableInput, actorId: string): Promise<RenamePayload> {
    const { newName, tableId } = input;

    const exists = await this.prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!exists) {
      throw new SeatingEntityNotFoundException('table', tableId);
    }

    const conflict = await this.prisma.table.findFirst({
      where: {
        eventId: exists.eventId,
        name: newName,
      },
    });

    if (conflict) {
      throw new SeatingConflictException('table', `Table "${newName}" already exists`);
    }

    // ✅ NO-OP CHECK
    if (exists.name.trim() === newName.trim()) {
      return {
        success: true,
        affectedSeats: 0,
      };
    }

    const updated = await this.prisma.table.update({
      where: { id: exists.id },
      data: { name: newName },
    });

    // 4️⃣ Betroffene Seats zählen
    const affectedSeats = await this.prisma.seat.count({
      where: {
        eventId: exists.eventId,
        tableId: updated.id,
      },
    });

    // 5️⃣ Audit-Log
    await this.layoutWriteService.logChange({
      eventId: exists.eventId,
      actorId,
      type: LayoutChangeType.TABLE_RENAME,
      payload: {
        from: exists.name,
        to: newName,
        tableId: updated.id,
      },
    });

    return {
      success: true,
      affectedSeats,
    };
  }

  async bulkRenameTables(
    inputs: RenameTableInput[],
    actorId: string,
  ): Promise<{
    affectedTables: number;
    affectedSeats: number;
    conflicts: RenameConflict[];
  }> {
    const conflicts: RenameConflict[] = [];
    let affectedTables = 0;
    let affectedSeats = 0;

    for (const input of inputs) {
      const table = await this.prisma.table.findUnique({
        where: { id: input.tableId },
        include: { seats: true },
      });

      if (!table) {
        continue;
      }

      // ✅ NO-OP → skip silently
      if (table.name.trim() === input.newName.trim()) {
        continue;
      }

      const nameExists = await this.prisma.table.findFirst({
        where: {
          sectionId: table.sectionId,
          name: input.newName,
          NOT: { id: table.id },
        },
      });

      if (nameExists) {
        conflicts.push({
          type: 'TABLE',
          id: table.id,
          name: input.newName,
        });
        continue;
      }

      await this.prisma.table.update({
        where: { id: table.id },
        data: { name: input.newName },
      });

      await this.layoutWriteService.logChange({
        eventId: table.eventId,
        actorId,
        type: LayoutChangeType.TABLE_RENAME,
        payload: {
          from: table.name,
          to: input.newName,
          tableIdId: table.id,
        },
      });

      affectedTables++;
      affectedSeats += table.seats.length;
    }

    return {
      affectedTables,
      affectedSeats,
      conflicts,
    };
  }
}
