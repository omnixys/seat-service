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

import { env } from '../config/env.js';
import { SeatVerificationTokenException } from '../seat/errors/seat-domain.error.js';
import { SeatWriteService } from '../seat/services/seat-write.service.js';
import { Injectable } from '@nestjs/common';
import { ValkeyKey, ValkeyService } from '@omnixys/cache';
import { ContextAccessor } from '@omnixys/context';
import type {
  CreateUserWithInvitationIdDTO,
  GuestSeatKey,
  GuestSignUpTokenPayload,
  GuestTicketKey,
  UserIdDTO,
} from '@omnixys/contracts';
import {
  KafkaEvent,
  KafkaEventHandler,
  KafkaTopics,
  IKafkaEventContext,
  KafkaProducerService,
  KAFKA_HEADERS,
  type EventType,
} from '@omnixys/kafka';
import { OmnixysLogger } from '@omnixys/logger';
import { TraceRunner } from '@omnixys/observability';
import { EncryptionService } from '@omnixys/security';

const { SERVICE } = env;

interface KafkaMetadata {
  actorId: string;
  tenantId: string;
  service: string;
  operation: string;
  version: string;
  type: EventType;
}

/**
 * Central Kafka Authentication Handler.
 *
 * Design principles:
 * - One class per domain (authentication)
 * - One method per Kafka topic
 * - Strict typing per method
 * - No switch/case
 * - No casting
 */
@KafkaEventHandler('authentication')
@Injectable()
export class AuthenticationHandler {
  private readonly logger;

  /**
   * Creates a new instance of {@link EventHandler}.
   *
   * @param loggerService - The central logger service used for structured logging.
   * @param userService - The service responsible for handling system-level user operations.
   */
  constructor(
    private readonly omnixysLogger: OmnixysLogger,
    private readonly seatWriteService: SeatWriteService,
    private readonly cache: ValkeyService,
    private readonly encryptionServie: EncryptionService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name);
  }

  @KafkaEvent(KafkaTopics.seat.addGuestId)
  async handleAddGuest(payload: CreateUserWithInvitationIdDTO): Promise<void> {
    return TraceRunner.run('[HANDLER] addGuestId', async () => {
      const { userId, token, invitationId } = payload;

      const decrypted = this.encryptionServie.decrypt(token, true);
      const { seatKey } = this.parseSignUpToken(decrypted);

      const raw = await this.cache.get(
        ValkeyKey.guestVerificationSeat,
        seatKey,
      );
      if (!raw) {
        throw new SeatVerificationTokenException('invalid-token');
      }

      const input = this.parseSeatKey(raw);

      /**
       * 🔥 find correct assignment
       */
      const assignment = input.assignments.find(
        (a) => a.invitationId === invitationId,
      );

      if (!assignment) {
        throw new SeatVerificationTokenException('assignment-not-found');
      }

      const seat = await this.seatWriteService.assignSeatToGuest({
        seatId: assignment.seatId,
        guestId: userId,
        invitationId,
        actorId: input.actorId,
        note: assignment.note,
        eventId: input.eventId,
      });

      /**
       * Ticket trigger
       */
      const ticketPayload: GuestTicketKey = {
        eventId: input.eventId,
        actorId: input.actorId,
        tickets: [
          {
            invitationId,
            seatId: seat.id,
          },
        ],
      };

      const ticketToken = await this.cache.set(
        ValkeyKey.guestVerificationTicket,
        JSON.stringify(ticketPayload),
        60,
      );

      await this.kafkaProducer.send({
        topic: KafkaTopics.ticket.create,
        payload: {
          token: ticketToken,
          invitationId,
          userId,
        },
        meta: this.meta(input.actorId, 'Create ticket'),
      });
    });
  }

  @KafkaEvent(KafkaTopics.seat.removeGuestId)
  async handleRemoveGuest(
    payload: UserIdDTO,
    context: IKafkaEventContext,
  ): Promise<void> {
    return TraceRunner.run('[HANDLER] addGuestId', async () => {
      this.logger.debug('Remove Guest ID %o', payload);
      const { userId } = payload;

      const headers = context.headers;
      const actorId = headers[KAFKA_HEADERS.ACTOR_ID] ?? 'unknown';
      await this.seatWriteService.unassignSeatsByGuestId(userId, actorId);
    });
  }

  /**
   * Standard Kafka metadata builder.
   */
  private meta(actorId: string, operation: string): KafkaMetadata {
    const context = ContextAccessor.get();
    const type: EventType = 'EVENT';
    return {
      actorId: context?.principal?.actorId ?? actorId,
      tenantId:
        context?.tenant?.tenantId ?? context?.principal?.tenantId ?? 'omnixys',
      service: SERVICE,
      operation,
      version: '1',
      type,
    };
  }

  private parseSignUpToken(raw: string): GuestSignUpTokenPayload {
    try {
      const value = JSON.parse(raw) as Partial<GuestSignUpTokenPayload>;
      if (typeof value.seatKey !== 'string') {
        throw new TypeError('Missing seat key');
      }
      return value as GuestSignUpTokenPayload;
    } catch (cause) {
      throw new SeatVerificationTokenException('invalid-token', { cause });
    }
  }

  private parseSeatKey(raw: string): GuestSeatKey {
    try {
      const value = JSON.parse(raw) as Partial<GuestSeatKey>;
      if (
        typeof value.eventId !== 'string' ||
        typeof value.actorId !== 'string' ||
        !Array.isArray(value.assignments) ||
        value.assignments.some(
          (assignment) => typeof assignment?.invitationId !== 'string',
        )
      ) {
        throw new TypeError('Invalid seat assignment payload');
      }
      return value as GuestSeatKey;
    } catch (cause) {
      throw new SeatVerificationTokenException('invalid-token', { cause });
    }
  }
}
