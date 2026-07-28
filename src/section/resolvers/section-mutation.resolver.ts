/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { EventPermissionKey, RealmRoleType } from '@omnixys/contracts';
import { OmnixysLogger } from '@omnixys/logger';

import { CreateSectionInput } from '../models/inputs/create-section.input.js';
import { RenameSectionInput } from '../models/inputs/rename-section.input.js';
import { UpdateSectionInput } from '../models/inputs/update-section.input.js';
import {
  BulkRenamePayload,
  RenamePayload,
} from '../models/payloads/rename.payload.js';
import { SectionPayload } from '../models/payloads/section.payload.js';
import { SectionWriteService } from '../services/section-write.service.js';
import {
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
  EventPermissionGuard,
  EventPermissions,
  RoleGuard,
  Roles,
} from '@omnixys/security';

@Resolver()
@UseGuards(CookieAuthGuard, RoleGuard, EventPermissionGuard)
@Roles(RealmRoleType.USER)
@EventPermissions(EventPermissionKey.ManageSeats)
export class SectionMutationResolver {
  private readonly log;
  constructor(
    private readonly sectionWriteService: SectionWriteService,
    logger: OmnixysLogger,
  ) {
    this.log = logger.log(this.constructor.name);
  }

  // ---------------------------------------------------------------------------
  // SECTION MUTATIONS
  // ---------------------------------------------------------------------------

  @Mutation(() => SectionPayload)
  async createSection(
    @Args('input') input: CreateSectionInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.log.debug('createSection: eventId=%s', input.eventId);
    return this.sectionWriteService.createSection(input, user.id);
  }

  @Mutation(() => SectionPayload)
  async updateSection(
    @Args('input') input: UpdateSectionInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.log.debug('updateSection: sectionId=%s', input.id);
    return this.sectionWriteService.updateSection(input, user.id);
  }

  @Mutation(() => Boolean)
  async deleteSection(
    @Args('sectionId') sectionId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.log.debug('deleteSection: sectionId=%s', sectionId);
    return this.sectionWriteService.deleteSection(sectionId, user.id);
  }

  @Mutation(() => RenamePayload)
  async renameSection(
    @Args('input') input: RenameSectionInput,
    @CurrentUser() user: CurrentUserData,
  ): Promise<RenamePayload> {
    return this.sectionWriteService.renameSection(input, user.id);
  }

  @Mutation(() => BulkRenamePayload)
  async bulkRenameSections(
    @Args('inputs', { type: () => [RenameSectionInput] })
    inputs: RenameSectionInput[],
    @CurrentUser() user: CurrentUserData,
  ): Promise<BulkRenamePayload> {
    const result = await this.sectionWriteService.bulkRenameSections(
      inputs,
      user.id,
    );

    return {
      success: result.conflicts.length === 0,
      affectedSections: result.affectedSections,
      affectedSeats: result.affectedSeats,
      conflicts: result.conflicts,
    };
  }
}
