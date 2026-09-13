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
import { SeatUnavailableException } from '../seat/errors/seat-domain.error.js';
import { SeatWriteService } from '../seat/services/seat-write.service.js';
import {
  SEAT_RESERVATION_FAILED_TOPIC,
  SEAT_RESERVED_TOPIC,
  SEAT_RESERVE_TOPIC,
  type SeatReserveDTO,
  type SeatReservedDTO,
  type SeatReservationFailedDTO,
} from './guest-seat-reservation.types.js';
import { Injectable } from '@nestjs/common';
import { ContextAccessor } from '@omnixys/context-ts';
import {
  KafkaEvent,
  KafkaEventHandler,
  KafkaProducerService,
  type EventType,
} from '@omnixys/kafka-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import { TraceRunner } from '@omnixys/observability-ts';

const { SERVICE, DEFAULT_TENANT_ID } = env;

interface KafkaMetadata {
  actorId: string;
  tenantId: string;
  service: string;
  operation: string;
  version: string;
  type: EventType;
}

/**
 * Reserves an available seat for a guest invitation on demand.
 *
 * The Invitation service requests a reservation (`seat.reserve`) for approved
 * invitations that have no seat yet and only sends the guest confirmation once
 * a seat is reserved (`seat.reserved`). When no seat is free, a
 * `seat.reservationFailed` acknowledgment is emitted and the confirmation is
 * postponed (no guest confirmation without a seatable ticket).
 */
@KafkaEventHandler('guest')
@Injectable()
export class GuestSeatReservationHandler {
  private readonly logger;

  constructor(
    private readonly omnixysLogger: OmnixysLogger,
    private readonly seatWriteService: SeatWriteService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name, 'service:seat');
  }

  @KafkaEvent(SEAT_RESERVE_TOPIC)
  async handleReserve(payload: SeatReserveDTO): Promise<void> {
    return TraceRunner.run('[HANDLER] reserveGuestSeat', async () => {
      const { eventId, invitationId, actorId } = payload;

      try {
        const seat = await this.seatWriteService.reserveSeatForInvitation({
          eventId,
          invitationId,
        });

        const reservedPayload: SeatReservedDTO = {
          eventId,
          invitationId,
          seatId: seat.id,
          actorId,
        };

        await this.kafkaProducer.send({
          topic: SEAT_RESERVED_TOPIC,
          payload: reservedPayload,
          meta: this.meta(actorId, 'Reserve guest seat'),
        });

        this.logger.debug(
          'Guest seat reserved: invitationId=%s seatId=%s',
          invitationId,
          seat.id,
        );
      } catch (error) {
        if (error instanceof SeatUnavailableException) {
          const failedPayload: SeatReservationFailedDTO = {
            eventId,
            invitationId,
          };

          await this.kafkaProducer.send({
            topic: SEAT_RESERVATION_FAILED_TOPIC,
            payload: failedPayload,
            meta: this.meta(actorId, 'Guest seat reservation failed'),
          });

          this.logger.warn(
            'No seat available for guest invitation: invitationId=%s eventId=%s',
            invitationId,
            eventId,
          );
          return;
        }
        throw error;
      }
    });
  }

  /**
   * Standard Kafka metadata builder.
   */
  private meta(actorId: string | undefined, operation: string): KafkaMetadata {
    const context = ContextAccessor.get();
    const type: EventType = 'EVENT';
    return {
      actorId: context?.principal?.actorId ?? actorId ?? 'system',
      tenantId:
        context?.tenant?.tenantId ??
        context?.principal?.tenantId ??
        DEFAULT_TENANT_ID,
      service: SERVICE,
      operation,
      version: '1',
      type,
    };
  }
}
