/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { PrismaService } from '../../prisma/prisma.service.js';
import { SeatingEntityNotFoundException } from '../../seat/errors/seat-domain.error.js';
import { TableMapper } from '../models/mappers/table.mapper.js';
import { Injectable } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger';

@Injectable()
export class TableReadService {
  private readonly logger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly omnixysLogger: OmnixysLogger,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name);
  }

  /** Throws if table does not exist */
  async ensureTable(tableId: string) {
    this.logger.debug('ensureTable');
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      throw new SeatingEntityNotFoundException('table', tableId);
    }
    return table;
  }

  // ─────────────────────────────────────────────
  // EVENT-LEVEL QUERIES
  // ─────────────────────────────────────────────

  /**
   * Returns all tables for an event.
   */
  async getEventTables(eventId: string) {
    const tables = await this.prisma.table.findMany({
      where: { eventId },
      orderBy: { order: 'asc' },
      include: { seats: true },
    });

    return TableMapper.toPayloadList(tables);
  }

  // ─────────────────────────────────────────────
  // TABLE QUERIES
  // ─────────────────────────────────────────────

  async getTableById(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { seats: true },
    });

    if (!table) {
      throw new SeatingEntityNotFoundException('table', id);
    }

    return TableMapper.toPayload(table);
  }

  async getTablesBySection(sectionId: string) {
    const tables = await this.prisma.table.findMany({
      where: { sectionId },
      include: { seats: true },
      orderBy: { order: 'asc' },
    });

    return TableMapper.toPayloadList(tables);
  }
}
