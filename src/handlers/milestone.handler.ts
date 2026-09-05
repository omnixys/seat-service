/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2025 Caleb Gyamfi - Omnixys Technologies
 */

import { PrismaService } from '../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import type { EventMilestoneRecordedDTO } from '@omnixys/contracts-ts';
import {
  KafkaEvent,
  KafkaEventHandler,
  KafkaTopics,
  type IKafkaEventContext,
} from '@omnixys/kafka-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import { TraceRunner } from '@omnixys/observability-ts';

@KafkaEventHandler('seat')
@Injectable()
export class MilestoneHandler {
  private readonly logger;

  constructor(
    private readonly omnixysLogger: OmnixysLogger,
    private readonly prisma: PrismaService,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name, 'service:seat');
  }

  @KafkaEvent(KafkaTopics.event.milestoneRecorded)
  async handleMilestone(
    payload: EventMilestoneRecordedDTO,
    _context: IKafkaEventContext,
  ): Promise<void> {
    return TraceRunner.run('[HANDLER] event.milestoneRecorded', async () => {
      if (
        payload.type !== 'TICKET_SCANNED' &&
        payload.type !== 'TICKET_REVOKED'
      ) {
        return;
      }

      if (!payload.referenceId) {
        this.logger.debug('Skipping milestone without referenceId: %o', {
          milestoneId: payload.milestoneId,
        });
        return;
      }

      const seatId = payload.referenceId;

      if (payload.type === 'TICKET_SCANNED') {
        const existing = await this.prisma.seatPresenceProjection.findUnique({
          where: { seatId },
        });

        const newState =
          existing?.presenceState === 'INSIDE' ? 'OUTSIDE' : 'INSIDE';
        const checkedInAt =
          newState === 'INSIDE' && !existing?.checkedInAt
            ? new Date(payload.occurredAt)
            : undefined;

        await this.prisma.seatPresenceProjection.upsert({
          where: { seatId },
          create: {
            seatId,
            eventId: payload.eventId,
            presenceState: newState,
            checkedInAt: checkedInAt ?? null,
          },
          update: {
            presenceState: newState,
            checkedInAt: checkedInAt ?? undefined,
          },
        });

        this.logger.debug('Presence updated for seat %s: %s', seatId, newState);
      } else if (payload.type === 'TICKET_REVOKED') {
        await this.prisma.seatPresenceProjection.upsert({
          where: { seatId },
          create: {
            seatId,
            eventId: payload.eventId,
            presenceState: 'OUTSIDE',
            revoked: true,
            revokedAt: new Date(payload.occurredAt),
          },
          update: {
            presenceState: 'OUTSIDE',
            revoked: true,
            revokedAt: new Date(payload.occurredAt),
          },
        });

        this.logger.debug('Ticket revoked for seat %s', seatId);
      }
    });
  }
}
