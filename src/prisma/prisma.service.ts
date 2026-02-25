/**
 * @license GPL-3.0-or-later
 * © 2025 Caleb Gyamfi – Omnixys Technologies
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import 'dotenv/config';

import { env } from '../config/env.js';
import { PrismaClient } from './generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const { DATABASE_URL } = env;
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: DATABASE_URL,
    });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    console.debug('📦 Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    console.debug('📦 Prisma disconnected');
  }
}
