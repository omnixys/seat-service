/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { PrismaService } from '../../prisma/prisma.service.js';
import { SeatingEntityNotFoundException } from '../../seat/errors/seat-domain.error.js';
import { SectionMapper } from '../../section/models/mappers/section.mapper.js';
import { LayoutChangeLogMapper } from '../models/mappers/layout-change-log.mapper.js';
import { LayoutVersionMapper } from '../models/mappers/layout-version.mapper.js';
import { Injectable } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger';

@Injectable()
export class LayoutReadService {
  private readonly logger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly omnixysLogger: OmnixysLogger,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name);
  }

  // ─────────────────────────────────────────────
  // EVENT-LEVEL QUERIES
  // ─────────────────────────────────────────────

  /**
   * Returns the entire seating layout for a given event.
   * Includes: sections -> tables -> seats
   */
  async getEventLayout(eventId: string) {
    this.logger.debug('getEventLayout: eventId: %s', eventId);
    const sectionList = await this.prisma.section.findMany({
      where: { eventId },
      orderBy: { order: 'asc' },
      include: {
        tables: {
          orderBy: { order: 'asc' },
          include: { seats: true },
        },
        seats: true,
      },
    });

    return SectionMapper.toPayloadList(sectionList);
  }

  async getLayoutVersions(eventId: string) {
    const layoutVersionList = await this.prisma.layoutVersion.findMany({
      where: { eventId },
      orderBy: { version: 'desc' },
    });

    return LayoutVersionMapper.toPayloadList(layoutVersionList);
  }

  async getLatestLayoutVersion(eventId: string) {
    const layoutVersion = await this.prisma.layoutVersion.findFirst({
      where: { eventId },
      orderBy: { version: 'desc' },
    });

    if (!layoutVersion) {
      throw new SeatingEntityNotFoundException('layout-version', eventId);
    }

    return LayoutVersionMapper.toPayload(layoutVersion);
  }

  async getLayoutChangeLog(eventId: string, limit = 200) {
    const layoutChangeLogs = await this.prisma.layoutChangeLog.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return LayoutChangeLogMapper.toPayloadList(layoutChangeLogs);
  }
}
