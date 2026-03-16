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
import { LayoutWriteService } from '../layout/services/layout-write.service.js';
import { LoggerPlusService } from '../logger/logger-plus.service.js';
import { Injectable } from '@nestjs/common';
import { CreateSeatMessageDTO } from '@omnixys/contracts';

/**
 * Kafka event handler responsible for useristrative commands such as
 * shutdown and restart. It listens for specific user-related topics
 * and delegates the actual process control logic to the {@link UserService}.
 *
 * @category Messaging
 * @since 1.0.0
 */
@KafkaHandler('event')
@Injectable()
export class EventHandler implements KafkaEventHandler {
  private readonly logger;

  /**
   * Creates a new instance of {@link EventHandler}.
   *
   * @param loggerService - The central logger service used for structured logging.
   * @param userService - The service responsible for handling system-level user operations.
   */
  constructor(
    private readonly loggerService: LoggerPlusService,
    private readonly layoutWriteService: LayoutWriteService,
  ) {
    this.logger = this.loggerService.getLogger(EventHandler.name);
  }

  /**
   * Handles incoming Kafka user events and executes the appropriate useristrative command.
   *
   * @param topic - The Kafka topic representing the user command (e.g. shutdown, restart).
   * @param data - The payload associated with the Kafka message.
   * @param context - The Kafka context metadata containing headers and partition info.
   *
   * @returns A Promise that resolves once the command has been processed.
   */
  @KafkaEvent(...getTopics('generateSeats'))
  async handle(
    topic: string,
    data: CreateSeatMessageDTO,
    context: KafkaEventContext,
  ): Promise<void> {
    this.logger.warn(`User command received: ${topic}`);
    this.logger.debug('Kafka context: %o', context);

    switch (topic) {
      case getTopic('generateSeats'):
        await this.createSeats(data);

        break;
      default:
        this.logger.warn(`Unknown user topic: ${topic}`);
    }
  }

  private async createSeats(data: CreateSeatMessageDTO): Promise<void> {
    this.logger.debug('autoGenerateLayout %o', data.payload);

    await this.layoutWriteService.autoGenerateFromMaxSeats(data.payload);
  }
}
