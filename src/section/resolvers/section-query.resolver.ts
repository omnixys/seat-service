import { UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { CookieAuthGuard } from '@omnixys/security';

import { SectionPayload } from '../models/payloads/section.payload.js';
import { SectionReadService } from '../services/section-read.service.js';

@Resolver()
@UseGuards(CookieAuthGuard)
export class SectionQueryResolver {
  constructor(private readonly sectionReadService: SectionReadService) {}

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------

  @Query(() => [SectionPayload])
  async sections(@Args('eventId') eventId: string): Promise<SectionPayload[]> {
    return this.sectionReadService.getEventSections(eventId);
  }

  @Query(() => SectionPayload, { nullable: true })
  async section(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<SectionPayload | null> {
    return this.sectionReadService.getSectionById(id);
  }
}
