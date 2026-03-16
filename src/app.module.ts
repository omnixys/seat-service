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

import { AdminModule } from './admin/admin.module.js';
import { env } from './config/env.js';
import { HandlerModule } from './handlers/handler.module.js';
import { HealthModule } from './health/health.module.js';
import { LayoutModule } from './layout/layout.module.js';
import { LoggerModule } from './logger/logger.module.js';
import { RequestLoggerMiddleware } from './logger/request-logger.middleware.js';
import { SeatModule } from './seat/seat.module.js';
import { SectionModule } from './section/section.module.js';
import { TableModule } from './table/table.module.js';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { KafkaModule } from '@omnixys/kafka';
import { FastifyReply, FastifyRequest } from 'fastify';

const { SCHEMA_TARGET, SERVICE, KAFKA_BROKER } = env;

@Module({
  imports: [
    KafkaModule.forRoot({
      clientId: `${SERVICE}-service`,
      brokers: [KAFKA_BROKER],
      groupId: `${SERVICE}-consumer`,
    }),
    AdminModule,
    SeatModule,
    TableModule,
    SectionModule,
    LayoutModule,
    HandlerModule,
    HealthModule,
    LoggerModule,
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,

      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        autoSchemaFile:
          SCHEMA_TARGET === 'tmp'
            ? { path: '/tmp/schema.gql', federation: 2 }
            : SCHEMA_TARGET === 'false'
              ? false
              : { path: 'dist/schema.gql', federation: 2 },
        sortSchema: true,
        playground: cfg.get('GRAPHQL_PLAYGROUND') === 'true',
        csrfPrevention: false,
        introspection: true,

        context: ({ req, res }: { req: FastifyRequest; res: FastifyReply }) => ({
          req,
          res,
        }),
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
