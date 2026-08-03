/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2025 Caleb Gyamfi - Omnixys Technologies
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * For more information, visit <https://www.gnu.org/licenses/>.
 */

import { PrismaService } from '../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import type { EventCreatedDTO, EventUpdatedDTO } from '@omnixys/contracts-ts';
import {
  KafkaEvent,
  KafkaEventHandler,
  KafkaTopics,
  type IKafkaEventContext,
} from '@omnixys/kafka-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import { TraceRunner } from '@omnixys/observability-ts';
import type { InputJsonValue } from '@prisma/client/runtime/client';

@KafkaEventHandler('event')
@Injectable()
export class EventSettingsHandler {
  private readonly logger;

  constructor(
    private readonly omnixysLogger: OmnixysLogger,
    private readonly prisma: PrismaService,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name);
  }

  @KafkaEvent(KafkaTopics.event.created)
  async handleEventCreated(
    payload: EventCreatedDTO,
    _context: IKafkaEventContext,
  ): Promise<void> {
    return TraceRunner.run('[HANDLER] event.created', async () => {
      const {
        eventId,
        name,
        endsAt,
        maxSeats,
        allowGuestSeatSelection,
        seatColorGroups,
      } = payload;

      await this.prisma.eventSettingsProjection.upsert({
        where: { eventId },
        create: {
          eventId,
          name,
          endsAt: endsAt ? new Date(endsAt) : null,
          maxSeats,
          allowGuestSeatSelection,
          seatColorGroups: (seatColorGroups ?? undefined) as
            InputJsonValue | undefined,
        },
        update: {
          name,
          endsAt: endsAt ? new Date(endsAt) : null,
          maxSeats,
          allowGuestSeatSelection,
          seatColorGroups: (seatColorGroups ?? undefined) as
            InputJsonValue | undefined,
        },
      });
    });
  }

  @KafkaEvent(KafkaTopics.event.updated)
  async handleEventUpdated(
    payload: EventUpdatedDTO,
    _context: IKafkaEventContext,
  ): Promise<void> {
    return TraceRunner.run('[HANDLER] event.updated', async () => {
      const {
        eventId,
        name,
        endsAt,
        maxSeats,
        allowGuestSeatSelection,
        seatColorGroups,
        occurredAt,
      } = payload;

      const existing = await this.prisma.eventSettingsProjection.findUnique({
        where: { eventId },
        select: { updatedAt: true },
      });

      if (
        existing?.updatedAt &&
        new Date(occurredAt).getTime() < existing.updatedAt.getTime()
      ) {
        this.logger.debug('Skipping stale event.updated', { eventId });
        return;
      }

      const updateData: Record<string, unknown> = {
        name: name ?? undefined,
        endsAt:
          endsAt !== undefined ? (endsAt ? new Date(endsAt) : null) : undefined,
        maxSeats: maxSeats ?? undefined,
        allowGuestSeatSelection: allowGuestSeatSelection ?? undefined,
      };

      if (seatColorGroups !== undefined) {
        updateData.seatColorGroups = seatColorGroups;
      }

      await this.prisma.eventSettingsProjection.upsert({
        where: { eventId },
        create: {
          eventId,
          name: name ?? null,
          endsAt: endsAt ? new Date(endsAt) : null,
          maxSeats: maxSeats ?? null,
          allowGuestSeatSelection: allowGuestSeatSelection ?? false,
          seatColorGroups: (seatColorGroups ?? undefined) as
            InputJsonValue | undefined,
        },
        update: updateData,
      });
    });
  }
}
