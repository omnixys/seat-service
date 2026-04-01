/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { PrismaService } from '../../prisma/prisma.service.js';
import { GuestEventSeatInput } from '../models/inputs/guest-event-seat.input.js';
import { SeatAssignmentLogMapper } from '../models/mappers/seat-assignment-log.mapper.js';
import { SeatMapper } from '../models/mappers/seat.mapper.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger';

@Injectable()
export class SeatReadService {
  private readonly logger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly omnixysLogger: OmnixysLogger,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name);
  }

  // ─────────────────────────────────────────────
  // GENERIC HELPERS
  // ─────────────────────────────────────────────
  /** Returns true if an event has any seat-related data */
  async eventExists(eventId: string): Promise<boolean> {
    const count = await this.prisma.section.count({
      where: { eventId },
    });
    return count > 0;
  }

  /** Throws if seat does not exist */
  async ensureSeat(seatId: string) {
    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
    });
    if (!seat) {
      throw new NotFoundException('Seat not found.');
    }
    return seat;
  }

  // ─────────────────────────────────────────────
  // SEAT QUERIES
  // ─────────────────────────────────────────────

  async getSeatById(id: string) {
    this.logger.debug('getSeatById');
    const seat = await this.prisma.seat.findUnique({
      where: { id },
      include: { section: true, table: true },
    });

    if (!seat) {
      throw new Error('getSeatById');
    }

    return SeatMapper.toPayload(seat);
  }

  async getSeatsBySection(sectionId: string) {
    const seat = await this.prisma.seat.findMany({
      where: { sectionId },
      orderBy: [{ tableId: 'asc' }, { number: 'asc' }],
    });

    return SeatMapper.toPayloadList(seat);
  }

  async getSeatsByTable(tableId: string) {
    const seat = await this.prisma.seat.findMany({
      where: { tableId },
      orderBy: { number: 'asc' },
    });

    return SeatMapper.toPayloadList(seat);
  }

  async getSeatsAssignedToGuest(guestId: string) {
    const seat = await this.prisma.seat.findMany({
      where: { guestId },
      include: { section: true, table: true },
    });

    return SeatMapper.toPayloadList(seat);
  }

  async getSeatAssignmentLogs(eventId: string) {
    const seat = await this.prisma.seatAssignmentLog.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    return SeatAssignmentLogMapper.toPayloadList(seat);
  }

  async getSeatsByEvent(eventId: string) {
    const seats = await this.prisma.seat.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    return SeatMapper.toPayloadList(seats);
  }

  /**
   * Returns count summary for the event.
   */
  async getEventSeatStats(eventId: string) {
    const total = await this.prisma.seat.count({ where: { eventId } });
    const assigned = await this.prisma.seat.count({
      where: { eventId, guestId: { not: null } },
    });
    const blocked = await this.prisma.seat.count({
      where: { eventId, status: 'BLOCKED' },
    });

    return { total, assigned, blocked };
  }

  /**
   * Returns all seats belonging to an event (flat, not grouped).
   */
  async getEventSeats(eventId: string) {
    const seat = await this.prisma.seatAssignmentLog.findMany({
      where: { eventId },
      // orderBy: [{ sectionId: 'asc' }, { tableId: 'asc' }, { number: 'asc' }],
    });

    return SeatAssignmentLogMapper.toPayloadList(seat);
  }

  async getSeatByEventAndGuest(input: GuestEventSeatInput) {
    const { eventId, guestId } = input;

    const seat = await this.prisma.seat.findFirst({
      where: { eventId, guestId },
    });

    if (!seat) {
      throw new Error('getSeatById');
    }

    return SeatMapper.toPayload(seat);
  }

  async getSeatsByIds(seatIds: string[]) {
    const seats = await this.prisma.seat.findMany({
      where: { id: { in: seatIds } },
    });

    return SeatMapper.toPayloadList(seats);
  }
}
