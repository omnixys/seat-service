/* eslint-disable @typescript-eslint/no-explicit-any */
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

import {
  KafkaEvent,
  KafkaHandler,
} from '../kafka/decorators/kafka-event.decorator.js';
import {
  type KafkaEventContext,
  KafkaEventHandler,
} from '../kafka/interface/kafka-event.interface.js';
import { getTopic, getTopics } from '../kafka/kafka-topic.properties.js';
import { LoggerPlusService } from '../logger/logger-plus.service.js';
import { AssignSeatDTO } from '../seat/models/dto/assign-seat.input.js';
import { SeatWriteService } from '../seat/services/seat-write.service.js';
import { Injectable } from '@nestjs/common';

/**
 * Kafka e vent handler responsible for useristrative commands such as
 * shutdown and restart. It listens for specific user-related topics
 * and delegates the actual process control logic to the {@link UserService}.
 *
 * @category Messaging
 * @since 1.0.0
 */
@KafkaHandler('ticket')
@Injectable()
export class TicketHandler implements KafkaEventHandler {
  private readonly logger;

  /**
   * Creat es a new instance of {@link UserHandler}.
   *
   * @param loggerService - The central logger service used for structured logging.
   * @param userService - The service responsible for handling system-level user operations.
   */
  constructor(
    private readonly loggerService: LoggerPlusService,
    private readonly seatWriteService: SeatWriteService,
  ) {
    this.logger = this.loggerService.getLogger(TicketHandler.name);
  }

  /**
   * Handl es incoming Kafka user events and executes the appropriate useristrative command.
   *
   * @param topic - The Kafka topic representing the user command (e.g. shutdown, restart).
   * @param data - The payload associated with the Kafka message.
   * @param context - The Kafka context metadata containing headers and partition info.
   *
   * @returns A Promise that resolves once the command has been processed.
   */
  @KafkaEvent(...getTopics('addGuest'))
  async handle(
    topic: string,
    // TODO DTO im plementieren
    data: any,
    context: KafkaEventContext,
  ): Promise<void> {
    this.logger.warn(`User command received: ${topic}`);
    this.logger.debug('Kafka context: %o', context);
    this.logger.debug('Kafka message: %o', data);

    switch (topic) {
      case getTopic('addGuest'):
        await this.addGuestId(data as { payload: AssignSeatDTO });

        break;
      default:
        this.logger.warn(`Unknown ticket topic: ${topic}`);
    }
  }

  private async addGuestId(data: { payload: AssignSeatDTO }): Promise<void> {
    await this.seatWriteService.assignSeatToGuest(data.payload);
  }
}
