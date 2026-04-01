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
import { nextOrder } from '../../utils/auto-order.js';
import { prepareMeta } from '../../utils/meta-defaults.js';
import { CreateSectionInput } from '../models/inputs/create-section.input.js';
import { RenameSectionInput } from '../models/inputs/rename-section.input.js';
import { UpdateSectionInput } from '../models/inputs/update-section.input.js';
import { RenameConflict, RenamePayload } from '../models/payloads/rename.payload.js';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger';
import { InputJsonValue } from '@prisma/client/runtime/client';

@Injectable()
export class SectionWriteService {
  private readonly logger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly omnixysLogger: OmnixysLogger,
    private readonly layoutWriteService: LayoutWriteService,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name);
  }

  // ---------------------------------------------------------------------------
  // SECTION CREATE
  // ---------------------------------------------------------------------------
  /**
   * Creates a new section (VIP, Family, Germany, etc.).
   * - Auto-assigns the next order index if missing
   * - Applies default metadata if not provided
   */
  async createSection(input: CreateSectionInput, actorId: string) {
    this.logger.debug('createSection');
    const autoOrder = await nextOrder(this.prisma.section, {
      eventId: input.eventId,
    });

    const created = await this.prisma.section.create({
      data: {
        eventId: input.eventId,
        name: input.name,
        order: input.order ?? autoOrder,
        capacity: input.capacity ?? null,
        meta: prepareMeta(input.meta) as InputJsonValue,
      },
    });

    await this.layoutWriteService.logChange({
      eventId: input.eventId,
      actorId,
      type: LayoutChangeType.SECTION_CREATE,
      payload: created,
    });

    return created;
  }

  // ---------------------------------------------------------------------------
  // SECTION UPDATE
  // ---------------------------------------------------------------------------
  /**
   * Updates a section's name, order, capacity or metadata.
   * - Meta is deep merged with defaults
   * - Order only updated if provided
   */
  async updateSection(input: UpdateSectionInput, actorId: string) {
    const exists = await this.prisma.section.findUnique({
      where: { id: input.id },
    });

    if (!exists) {
      throw new NotFoundException('Section not found.');
    }

    const updated = await this.prisma.section.update({
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
      type: LayoutChangeType.SECTION_UPDATE,
      payload: input,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // SECTION DELETE
  // ---------------------------------------------------------------------------
  /**
   * Deletes a section and all associated tables & seats
   * (Cascade defined in Prisma schema).
   */
  async deleteSection(sectionId: string, actorId: string) {
    const exists = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!exists) {
      throw new NotFoundException('Section not found.');
    }

    await this.prisma.section.delete({
      where: { id: sectionId },
    });

    await this.layoutWriteService.logChange({
      eventId: exists.eventId,
      actorId,
      type: LayoutChangeType.SECTION_DELETE,
      payload: { id: sectionId },
    });

    return true;
  }

  async renameSection(input: RenameSectionInput, actorId: string): Promise<RenamePayload> {
    const { newName, sectionId } = input;

    const exists = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!exists) {
      throw new NotFoundException('Section not found.');
    }

    const conflict = await this.prisma.section.findFirst({
      where: {
        eventId: exists.eventId,
        name: newName,
      },
    });

    if (conflict) {
      throw new ConflictException(`Section "${newName}" already exists`);
    }

    // ✅ NO-OP CHECK
    if (exists.name.trim() === newName.trim()) {
      return {
        success: true,
        affectedSeats: 0,
      };
    }

    const updated = await this.prisma.section.update({
      where: { id: exists.id },
      data: { name: newName },
    });

    // 4️⃣ Betroffene Seats zählen
    const affectedSeats = await this.prisma.seat.count({
      where: {
        eventId: exists.eventId,
        sectionId: updated.id,
      },
    });

    // 5️⃣ Audit-Log
    await this.layoutWriteService.logChange({
      eventId: exists.eventId,
      actorId,
      type: LayoutChangeType.SECTION_RENAME,
      payload: {
        from: exists.name,
        to: newName,
        sectionId: updated.id,
      },
    });

    return {
      success: true,
      affectedSeats,
    };
  }

  async bulkRenameSections(
    inputs: RenameSectionInput[],
    actorId: string,
  ): Promise<{
    affectedSections: number;
    affectedSeats: number;
    conflicts: RenameConflict[];
  }> {
    const conflicts: RenameConflict[] = [];
    let affectedSections = 0;
    let affectedSeats = 0;

    for (const input of inputs) {
      const section = await this.prisma.section.findUnique({
        where: { id: input.sectionId },
        include: { seats: true },
      });

      if (!section) {
        continue;
      }

      // ✅ NO-OP → skip silently
      if (section.name.trim() === input.newName.trim()) {
        continue;
      }

      const nameExists = await this.prisma.section.findFirst({
        where: {
          eventId: section.eventId,
          name: input.newName,
          NOT: { id: section.id },
        },
      });

      if (nameExists) {
        conflicts.push({
          type: 'SECTION',
          id: section.id,
          name: input.newName,
        });
        continue;
      }

      await this.prisma.section.update({
        where: { id: section.id },
        data: { name: input.newName },
      });

      await this.layoutWriteService.logChange({
        eventId: section.eventId,
        actorId,
        type: LayoutChangeType.SECTION_RENAME,
        payload: {
          from: section.name,
          to: input.newName,
          sectionId: section.id,
        },
      });

      affectedSections++;
      affectedSeats += section.seats.length;
    }

    return {
      affectedSections,
      affectedSeats,
      conflicts,
    };
  }
}
