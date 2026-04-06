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

import { LayoutWriteService } from '../layout/services/layout-write.service.js';
import { Injectable } from '@nestjs/common';
import {
  KafkaEvent,
  KafkaEventHandler,
  KafkaTopics,
  IKafkaEventContext,
  KAFKA_HEADERS,
} from '@omnixys/kafka';
import { OmnixysLogger } from '@omnixys/logger';
import { TraceRunner } from '@omnixys/observability';
import { CreateSeatDTO, EventIdsDTO } from '@omnixys/shared';

/**
 * Kafka event handler responsible for useristrative commands such as
 * shutdown and restart. It listens for specific user-related topics
 * and delegates the actual process control logic to the {@link UserService}.
 *
 * @category Messaging
 * @since 1.0.0
 */
@KafkaEventHandler('event')
@Injectable()
export class EventHandler {
  private readonly logger;

  /**
   * Creates a new instance of {@link EventHandler}.
   *
   * @param loggerService - The central logger service used for structured logging.
   * @param userService - The service responsible for handling system-level user operations.
   */
  constructor(
    private readonly omnixysLogger: OmnixysLogger,
    private readonly layoutWriteService: LayoutWriteService,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name);
  }

  @KafkaEvent(KafkaTopics.seat.create)
  async handleCreateSeat(payload: CreateSeatDTO, _context: IKafkaEventContext) {
    return TraceRunner.run('[HANDLER] create Seats', async () => {
      this.logger.debug('autoGenerateLayout %o', payload);
      await this.layoutWriteService.autoGenerateFromMaxSeats(payload);
    });
  }

  @KafkaEvent(KafkaTopics.seat.delete)
  async handleDeleteSeat(payload: EventIdsDTO, context: IKafkaEventContext) {
    return TraceRunner.run('[HANDLER] Deletes Seats', async () => {
      this.logger.debug('Delete Seats %o', payload);
      
            const headers = context.headers;
            const actorId = headers[KAFKA_HEADERS.ACTOR_ID] ?? 'Unkown';

    await this.layoutWriteService.deleteSeats({eventIds: payload.eventIds, actorId});
    });
  }
}
