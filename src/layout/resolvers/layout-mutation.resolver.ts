// src/layout/resolvers/layout-mutation.resolver.ts
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { SeatPayload } from '../../seat/models/payloads/seat.payload.js';
import { SectionPayload } from '../../section/models/payloads/section.payload.js';
import { TablePayload } from '../../table/models/payloads/table.payload.js';

import { AutoGenerateSeatMapInput } from '../models/inputs/auto-generate-seat-map.input.js';
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
import { EventPermissionKey, RealmRoleType } from '@omnixys/contracts-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import {
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
  EventPermissionGuard,
  EventPermissions,
  RoleGuard,
  Roles,
} from '@omnixys/security-ts';

@Resolver()
@UseGuards(CookieAuthGuard, RoleGuard, EventPermissionGuard)
@Roles(RealmRoleType.USER, RealmRoleType.ADMIN)
@EventPermissions(EventPermissionKey.ManageSeats)
export class LayoutMutationResolver {
  private readonly log;
  constructor(
    private readonly layoutWrite: LayoutWriteService,
    logger: OmnixysLogger,
  ) {
    this.log = logger.log(this.constructor.name);
  }

  // ---------------------------------------------------------------------------
  // VERSIONING & CHANGELOG
  // ---------------------------------------------------------------------------

  @Mutation(() => LayoutVersionPayload)
  @UseGuards(CookieAuthGuard)
  async saveLayoutVersion(
    @Args('input') input: SaveLayoutVersionInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.log.debug(
      'saveLayoutVersion: eventId=%s | version=%s',
      input.eventId,
      input.version,
    );
    return this.layoutWrite.saveLayoutVersion(input, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async undoLayout(@Args('eventId') eventId: string) {
    this.log.debug('undoLayout: eventId=%s', eventId);
    return this.layoutWrite.undo(eventId);
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async redoLayout(@Args('eventId') eventId: string) {
    this.log.debug('redoLayout: eventId=%s', eventId);
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
    this.log.debug('autoGenerateLayout: eventId=%s', input.eventId);
    return this.layoutWrite.autoGenerate(input, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async autoGenerateSeatMap(
    @Args('input') input: AutoGenerateSeatMapInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.log.debug(
      'autoGenerateSeatMap: eventId=%s | seats=%s | tables=%s',
      input.eventId,
      input.seatCount,
      input.tableCount,
    );
    return this.layoutWrite.autoGenerateSeatMap(input, user.id);
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
