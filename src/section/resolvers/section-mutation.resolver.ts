/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { EventRoleType, RealmRoleType } from '@omnixys/contracts';

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
  EventRoleGuard,
  EventRoles,
  RoleGuard,
  Roles,
} from '@omnixys/security';

@Resolver()
@UseGuards(CookieAuthGuard, RoleGuard, EventRoleGuard)
@Roles(RealmRoleType.USER)
@EventRoles(EventRoleType.ADMIN)
export class SectionMutationResolver {
  constructor(private readonly sectionWriteService: SectionWriteService) {}

  // ---------------------------------------------------------------------------
  // SECTION MUTATIONS
  // ---------------------------------------------------------------------------

  @Mutation(() => SectionPayload)
  async createSection(
    @Args('input') input: CreateSectionInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.sectionWriteService.createSection(input, user.id);
  }

  @Mutation(() => SectionPayload)
  async updateSection(
    @Args('input') input: UpdateSectionInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.sectionWriteService.updateSection(input, user.id);
  }

  @Mutation(() => Boolean)
  async deleteSection(
    @Args('sectionId') sectionId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
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
