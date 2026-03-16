// src/layout/resolvers/layout-mutation.resolver.ts
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { SeatPayload } from '../../seat/models/payloads/seat.payload.js';
import { SectionPayload } from '../../section/models/payloads/section.payload.js';
import { TablePayload } from '../../table/models/payloads/table.payload.js';

import { AutoGenerateLayoutInput } from '../models/inputs/auto-generate.input.js';
import { CloneSectionInput } from '../models/inputs/clone-section.input.js';
import { DuplicateTableInput } from '../models/inputs/duplicate-Table-input.js';
import {
  MoveSeatInput,
  MoveSectionInput,
  MoveTableInput,
} from '../models/inputs/move-seat.input.js';
import { SaveLayoutVersionInput } from '../models/inputs/save-layout-version.input.js';

import { LayoutWriteService } from '../services/layout-write.service.js';

import { LayoutVersionPayload } from '../models/payloads/layout-version.payload.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CookieAuthGuard, CurrentUser, CurrentUserData } from '@omnixys/auth';

@Resolver()
export class LayoutMutationResolver {
  constructor(private readonly layoutWrite: LayoutWriteService) {}

  // ---------------------------------------------------------------------------
  // VERSIONING & CHANGELOG
  // ---------------------------------------------------------------------------

  @Mutation(() => LayoutVersionPayload)
  @UseGuards(CookieAuthGuard)
  async saveLayoutVersion(
    @Args('input') input: SaveLayoutVersionInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.layoutWrite.saveLayoutVersion(input, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async undoLayout(@Args('eventId') eventId: string) {
    return this.layoutWrite.undo(eventId);
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async redoLayout(@Args('eventId') eventId: string) {
    return this.layoutWrite.redo(eventId);
  }

  // ---------------------------------------------------------------------------
  // AUTO-LAYOUT SYSTEM (GeometryEngine v3)
  // ---------------------------------------------------------------------------

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async autoGenerateLayout(
    @Args('input') input: AutoGenerateLayoutInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.layoutWrite.autoGenerate(input, user.id);
  }

  // ---------------------------------------------------------------------------
  // TABLE OPS
  // ---------------------------------------------------------------------------

  @Mutation(() => TablePayload)
  @UseGuards(CookieAuthGuard)
  async duplicateTable(
    @Args('input') input: DuplicateTableInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.layoutWrite.duplicateTable(input, user.id);
  }

  // ---------------------------------------------------------------------------
  // SECTION OPS
  // ---------------------------------------------------------------------------

  @Mutation(() => SectionPayload)
  @UseGuards(CookieAuthGuard)
  async cloneSection(
    @Args('input') input: CloneSectionInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.layoutWrite.cloneSection(input, user.id);
  }

  // ---------------------------------------------------------------------------
  // SEAT OPS
  // ---------------------------------------------------------------------------

  @Mutation(() => SeatPayload)
  @UseGuards(CookieAuthGuard)
  async moveSeat(
    @Args('input') input: MoveSeatInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.layoutWrite.moveSeat(input, user.id);
  }

  @Mutation(() => SeatPayload)
  @UseGuards(CookieAuthGuard)
  async moveSection(
    @Args('input') input: MoveSectionInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.layoutWrite.moveSection(input, user.id);
  }

  @Mutation(() => SeatPayload)
  @UseGuards(CookieAuthGuard)
  async moveTable(
    @Args('input') input: MoveTableInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.layoutWrite.moveTable(input, user.id);
  }
}
