/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* ---------------------------------------------------------------------------
 * SECTION MUTATIONS
 * - Creates, updates and deletes logical seat areas (“Sections”)
 * - Applies meta defaults (deep merged)
 * - Applies auto-order (only-if-missing)
 * ------------------------------------------------------------------------- */

import { LayoutWriteService } from '../../layout/services/layout-write.service.js';
import { LayoutChangeType, SeatStatus } from '../../prisma/generated/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { prepareMeta } from '../../utils/meta-defaults.js';
import { AssignSeatDTO } from '../models/dto/assign-seat.input.js';
import { AssignSeatInput } from '../models/inputs/assign-seat.input.js';
import { CreateSeatInput } from '../models/inputs/create-seat.input.js';
import { UpdateSeatInput } from '../models/inputs/update-seat.input.js';
import { Injectable, NotFoundException } from '@nestjs/common';
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
      throw new NotFoundException('Seat not found.');
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
      throw new NotFoundException('Seat not found.');
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
        throw new NotFoundException('Seat not found.');
      }

      // ---------------------------------------------------------
      // 1) Andere Seats freimachen (wegen UNIQUE constraints)
      // ---------------------------------------------------------
      if (hasAssignment) {
        const conflictingSeats = await tx.seat.findMany({
          where: {
            eventId: seat.eventId,
            NOT: { id: seat.id },
            OR: [
              guestId ? { guestId } : undefined,
              invitationId ? { invitationId } : undefined,
            ].filter(Boolean) as any,
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
      const { seatId, guestId, actorId, note, invitationId } = input;

      let updated;
      let seat;

      if (!seatId) {
        seat = await this.prisma.seat.findFirst({
          where: { status: SeatStatus.AVAILABLE },
          orderBy: { createdAt: 'asc' }, // oder irgendeine andere Logik
        });

        if (!seat) {
          throw new Error('No available seats found');
        }

        updated = await this.prisma.seat.update({
          where: {
            id: seat?.id,
            status: SeatStatus.AVAILABLE,
          },
          data: {
            guestId,
            invitationId,
            status: 'ASSIGNED',
            note,
          },
        });
      } else {
        seat = await this.prisma.seat.findUnique({
          where: { id: seatId },
        });

        if (!seat) {
          throw new NotFoundException('Seat not found.');
        }

        updated = await this.prisma.seat.update({
          where: { id: input.seatId },
          data: {
            guestId: input.guestId,
            invitationId,
            status: 'ASSIGNED',
            note,
          },
        });
      }

      await this.prisma.seatAssignmentLog.create({
        data: {
          eventId: seat.eventId,
          seatId: seat.id,
          invitationId,
          guestId,
          action: 'ASSIGNED',
          data: {},
        },
      });

      await this.layoutWriteService.logChange({
        eventId: seat.eventId,
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
}
