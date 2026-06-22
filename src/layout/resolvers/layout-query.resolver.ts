import { LayoutReadService } from '../services/layout-read.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Query, Resolver } from '@nestjs/graphql';
import { CookieAuthGuard } from '@omnixys/security';

import { SectionPayload } from '../../section/models/payloads/section.payload.js';
import { LayoutChangeLogPayload } from '../models/payloads/layout-change-log.payload.js';
import { LayoutVersionPayload } from '../models/payloads/layout-version.payload.js';

@Resolver()
@UseGuards(CookieAuthGuard)
export class LayoutQueryResolver {
  constructor(private readonly layoutReadService: LayoutReadService) {}

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------

  /** Returns entire seating layout for a given event */
  @Query(() => [SectionPayload])
  async seatLayout(
    @Args('eventId', { type: () => ID }) eventId: string,
  ): Promise<SectionPayload[]> {
    return this.layoutReadService.getEventLayout(eventId);
  }

  @Query(() => [LayoutVersionPayload])
  async layoutVersions(
    @Args('eventId', { type: () => ID }) eventId: string,
  ): Promise<LayoutVersionPayload[]> {
    return this.layoutReadService.getLayoutVersions(eventId);
  }

  @Query(() => LayoutVersionPayload, { nullable: true })
  async latestLayoutVersion(
    @Args('eventId', { type: () => ID }) eventId: string,
  ): Promise<LayoutVersionPayload | null> {
    return this.layoutReadService.getLatestLayoutVersion(eventId);
  }

  @Query(() => [LayoutChangeLogPayload])
  async layoutChangeLog(
    @Args('eventId', { type: () => ID }) eventId: string,
    @Args('limit', { type: () => Int, nullable: true }) limit = 200,
  ): Promise<LayoutChangeLogPayload[]> {
    return this.layoutReadService.getLayoutChangeLog(eventId, limit);
  }
}
