/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { PrismaService } from '../../prisma/prisma.service.js';
import { SeatingEntityNotFoundException } from '../../seat/errors/seat-domain.error.js';
import { SectionMapper } from '../models/mappers/section.mapper.js';
import { Injectable } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger';

@Injectable()
export class SectionReadService {
  private readonly logger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly omnixysLogger: OmnixysLogger,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name);
  }

  /** Throws if section does not exist */
  async ensureSection(sectionId: string) {
    this.logger.debug('ensureSection');
    const sec = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!sec) {
      throw new SeatingEntityNotFoundException('section', sectionId);
    }
    return SectionMapper.toPayload(sec);
  }

  /**
   * Returns all sections for an event.
   */
  async getEventSections(eventId: string) {
    const sections = await this.prisma.section.findMany({
      where: { eventId },
      orderBy: { order: 'asc' },
      include: { tables: true, seats: true },
    });

    return SectionMapper.toPayloadList(sections);
  }

  // ─────────────────────────────────────────────
  // SECTION QUERIES
  // ─────────────────────────────────────────────

  async getSectionById(id: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        tables: { include: { seats: true }, orderBy: { order: 'asc' } },
        seats: true,
      },
    });

    if (!section) {
      throw new SeatingEntityNotFoundException('section', id);
    }

    return SectionMapper.toPayload(section);
  }
}
