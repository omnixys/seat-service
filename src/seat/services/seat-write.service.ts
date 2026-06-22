/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* ---------------------------------------------------------------------------
 * SECTION MUTATIONS
 * - Creates, updates and deletes logical seat areas (“Sections”)
 * - Applies meta defaults (deep merged)
 * - Applies auto-order (only-if-missing)
 * ------------------------------------------------------------------------- */

import { LayoutWriteService } from '../../layout/services/layout-write.service.js';
import { LayoutChangeType, SeatStatus, type Prisma } from '../../prisma/generated/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { prepareMeta } from '../../utils/meta-defaults.js';
import {
  SeatEventMismatchException,
  SeatNotFoundException,
  SeatUnavailableException,
} from '../errors/seat-domain.error.js';
import { AssignSeatDTO } from '../models/dto/assign-seat.input.js';
import { AssignSeatInput } from '../models/inputs/assign-seat.input.js';
import { CreateSeatInput } from '../models/inputs/create-seat.input.js';
import { UpdateSeatInput } from '../models/inputs/update-seat.input.js';
import { Injectable } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger';
import { TraceRunner } from '@omnixys/observability';
import { InputJsonValue } from '@prisma/client/runtime/client';

@Injectable()
export class SeatWriteService {
  private readonly logger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly omnixysLogger: OmnixysLogger,
    private readonly layoutWriteService: LayoutWriteService,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name);
  }

  /* ---------------------------------------------------------------------------
   * SEAT MUTATIONS
   * Handles individual seat creation, editing, movement and assignment.
   * Applies:
   *  - Meta defaults (deep merged)
   *  - JSON safety
   *  - Clean logging
   * ------------------------------------------------------------------------- */

  /* ---------------------------------------------------------------------------
   * CREATE SEAT
   * ------------------------------------------------------------------------- */
  /**
   * Creates a single seat.
   * - Meta defaults are always applied if missing.
   */
  async createSeat(input: CreateSeatInput, actorId: string) {
    const created = await this.prisma.seat.create({
      data: {
        eventId: input.eventId,
        sectionId: input.sectionId,
        tableId: input.tableId ?? null,
        number: input.number ?? null,
        label: input.label ?? null,
        note: input.note ?? null,
        x: input.x ?? null,
        y: input.y ?? null,
        rotation: input.rotation ?? null,
        seatType: input.seatType ?? null,
        meta: prepareMeta(input.meta) as InputJsonValue,
      },
    });

    await this.layoutWriteService.logChange({
      eventId: input.eventId,
      actorId,
      type: 'SEAT_CREATE',
      payload: created,
    });

    return created;
  }

  /* ---------------------------------------------------------------------------
   * UPDATE SEAT
   * ------------------------------------------------------------------------- */
  /**
   * Updates seat geometry or metadata.
   */
  async updateSeat(input: UpdateSeatInput, actorId: string) {
    const exists = await this.prisma.seat.findUnique({
      where: { id: input.id },
    });

    if (!exists) {
      throw new SeatNotFoundException(input.id);
    }

    const updated = await this.prisma.seat.update({
      where: { id: input.id },
      data: {
        label: input.label ?? undefined,
        note: input.note ?? undefined,
        number: input.number ?? undefined,
        seatType: input.seatType ?? undefined,
        x: input.x ?? undefined,
        y: input.y ?? undefined,
        rotation: input.rotation ?? undefined,
        meta: input.meta ? (prepareMeta(input.meta) as InputJsonValue) : undefined,
      },
    });

    await this.layoutWriteService.logChange({
      eventId: exists.eventId,
      actorId,
      type: 'SEAT_UPDATE',
      payload: input,
    });

    return updated;
  }

  /* ---------------------------------------------------------------------------
   * DELETE SEAT
   * ------------------------------------------------------------------------- */
  /**
   * Deletes a seat entirely.
   */
  async deleteSeat(seatId: string, actorId: string) {
    this.logger.debug('delete Seat: seatId: %s', seatId);
    const exists = await this.prisma.seat.findUnique({
      where: { id: seatId },
    });

    if (!exists) {
      throw new SeatNotFoundException(seatId);
    }

    await this.prisma.seat.delete({
      where: { id: seatId },
    });

    await this.layoutWriteService.logChange({
      eventId: exists.eventId,
      actorId,
      type: 'SEAT_DELETE',
      payload: { id: seatId },
    });

    return true;
  }

  /* ---------------------------------------------------------------------------
   * ASSIGN SEAT
   * ------------------------------------------------------------------------- */
  /**
   * Assigns a guest to a seat.
   */
  async assignSeat(input: AssignSeatInput, actorId: string) {
    const { seatId, guestId, invitationId, note } = input;

    // 👉 Echte semantische Entscheidung
    const hasAssignment = Boolean(guestId || invitationId);

    return this.prisma.$transaction(async (tx) => {
      const seat = await tx.seat.findUnique({
        where: { id: seatId },
      });

      if (!seat) {
        throw new SeatNotFoundException(seatId);
      }

      // ---------------------------------------------------------
      // 1) Andere Seats freimachen (wegen UNIQUE constraints)
      // ---------------------------------------------------------
      if (hasAssignment) {
        const assignmentFilters: Prisma.SeatWhereInput[] = [];
        if (guestId) {
          assignmentFilters.push({ guestId });
        }
        if (invitationId) {
          assignmentFilters.push({ invitationId });
        }
        const conflictingSeats = await tx.seat.findMany({
          where: {
            eventId: seat.eventId,
            NOT: { id: seat.id },
            OR: assignmentFilters,
          },
        });

        for (const s of conflictingSeats) {
          await tx.seat.update({
            where: { id: s.id },
            data: {
              guestId: null,
              invitationId: null,
              note: null,
              status: 'AVAILABLE',
            },
          });

          await tx.seatAssignmentLog.create({
            data: {
              eventId: seat.eventId,
              seatId: s.id,
              guestId,
              invitationId,
              action: 'UNASSIGNED',
              data: {
                reason: 'REASSIGNED',
                previousSeatId: s.id,
              },
            },
          });
        }
      }

      // ---------------------------------------------------------
      // 2) Ziel-Seat aktualisieren
      // ---------------------------------------------------------
      const updated = await tx.seat.update({
        where: { id: seat.id },
        data: {
          guestId: guestId ?? null,
          invitationId: invitationId ?? null,
          note: note ?? null, // UI only
          status: hasAssignment ? 'ASSIGNED' : 'AVAILABLE',
        },
      });

      await tx.seatAssignmentLog.create({
        data: {
          eventId: seat.eventId,
          seatId: seat.id,
          guestId,
          invitationId,
          action: hasAssignment ? 'ASSIGNED' : 'UNASSIGNED',
          data: {},
        },
      });

      // ---------------------------------------------------------
      // 3) Layout / Audit Log
      // ---------------------------------------------------------
      await this.layoutWriteService.logChange({
        eventId: seat.eventId,
        actorId,
        type: hasAssignment ? LayoutChangeType.SEAT_ASSIGNED : LayoutChangeType.SEAT_UNASSIGNED,
        payload: input,
      });

      return updated;
    });
  }

  async assignSeatToGuest(input: AssignSeatDTO) {
    return TraceRunner.run('[SERVICE] assignSeatToGuest', async () => {
      const { seatId, guestId, actorId, note, invitationId, eventId } = input;

      const updated = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.seat.findFirst({
          where: {
            eventId,
            guestId,
            invitationId,
          },
        });
        if (existing) {
          return existing;
        }

        const seat = seatId
          ? await tx.seat.findUnique({ where: { id: seatId } })
          : await tx.seat.findFirst({
              where: {
                eventId,
                status: SeatStatus.AVAILABLE,
                guestId: null,
                invitationId: null,
              },
              orderBy: { createdAt: 'asc' },
            });

        if (!seat) {
          throw new SeatUnavailableException(eventId, seatId);
        }
        if (seat.eventId !== eventId) {
          throw new SeatEventMismatchException(seat.id, eventId, seat.eventId);
        }

        const reservedForInvitation =
          invitationId !== undefined && seat.invitationId === invitationId && seat.guestId === null;
        const claimed = await tx.seat.updateMany({
          where: reservedForInvitation
            ? {
                id: seat.id,
                eventId,
                invitationId,
                guestId: null,
              }
            : {
                id: seat.id,
                eventId,
                status: SeatStatus.AVAILABLE,
                guestId: null,
                invitationId: null,
              },
          data: {
            guestId,
            invitationId,
            status: SeatStatus.ASSIGNED,
            note,
          },
        });
        if (claimed.count !== 1) {
          throw new SeatUnavailableException(eventId, seat.id);
        }

        const result = await tx.seat.findUnique({ where: { id: seat.id } });
        if (!result) {
          throw new SeatNotFoundException(seat.id);
        }

        await tx.seatAssignmentLog.create({
          data: {
            eventId,
            seatId: result.id,
            invitationId,
            guestId,
            action: 'ASSIGNED',
            data: {},
          },
        });
        return result;
      });

      await this.layoutWriteService.logChange({
        eventId,
        actorId,
        type: 'SEAT_ASSIGNED',
        payload: input,
      });

      return updated;
    });
  }

  /* ---------------------------------------------------------------------------
   * UNASSIGN SEAT
   * ------------------------------------------------------------------------- */
  /**
   * Removes a guest assignment from a seat.
   */
  async unassignSeat(seatId: string, actorId: string) {
    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
    });

    if (!seat) {
      this.logger.warn('Already deleted → skipping');
      return;
    }

    const updated = await this.prisma.seat.update({
      where: { id: seatId },
      data: {
        guestId: null,
        invitationId: null,
        status: 'AVAILABLE',
        note: null,
      },
    });

    await this.prisma.seatAssignmentLog.create({
      data: {
        eventId: seat.eventId,
        seatId: seat.id,
        guestId: null,
        action: 'UNASSIGNED',
        data: {},
      },
    });

    await this.layoutWriteService.logChange({
      eventId: seat.eventId,
      actorId,
      type: 'SEAT_UNASSIGNED',
      payload: { seatId },
    });

    return updated;
  }

  async unassignSeatsByGuestId(guestId: string, actorId: string): Promise<void> {
    const seats = await this.prisma.seat.findMany({ where: { guestId } });
    for (const seat of seats) {
      await this.unassignSeat(seat.id, actorId);
    }
  }
}
