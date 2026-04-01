/* eslint-disable @typescript-eslint/explicit-function-return-type */

import {
  BulkRenamePayload,
  RenamePayload,
} from '../../section/models/payloads/rename.payload.js';
import { CreateTableInput } from '../models/inputs/create-table.input.js';
import { RenameTableInput } from '../models/inputs/rename-table.input.js';
import { UpdateTableInput } from '../models/inputs/update-table.input.js';
import { TablePayload } from '../models/payloads/table.payload.js';
import { TableWriteService } from '../services/table-write.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
} from '@omnixys/security';

@Resolver()
export class TableMutationResolver {
  constructor(private readonly tableWriteService: TableWriteService) {}

  // ---------------------------------------------------------------------------
  // TABLE MUTATIONS
  // ---------------------------------------------------------------------------

  @Mutation(() => TablePayload)
  @UseGuards(CookieAuthGuard)
  async createTable(
    @Args('input') input: CreateTableInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tableWriteService.createTable(input, user.id);
  }

  @Mutation(() => TablePayload)
  @UseGuards(CookieAuthGuard)
  async updateTable(
    @Args('input') input: UpdateTableInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tableWriteService.updateTable(input, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async deleteTable(
    @Args('tableId') tableId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tableWriteService.deleteTable(tableId, user.id);
  }

  @Mutation(() => RenamePayload)
  @UseGuards(CookieAuthGuard)
  async renameTable(
    @Args('input') input: RenameTableInput,
    @CurrentUser() user: CurrentUserData,
  ): Promise<RenamePayload> {
    return this.tableWriteService.renameTable(input, user.id);
  }

  @Mutation(() => BulkRenamePayload)
  @UseGuards(CookieAuthGuard)
  async bulkRenameTables(
    @Args('inputs', { type: () => [RenameTableInput] })
    inputs: RenameTableInput[],
    @CurrentUser() user: CurrentUserData,
  ): Promise<BulkRenamePayload> {
    const result = await this.tableWriteService.bulkRenameTables(
      inputs,
      user.id,
    );

    return {
      success: result.conflicts.length === 0,
      affectedTables: result.affectedTables,
      affectedSeats: result.affectedSeats,
      conflicts: result.conflicts,
    };
  }
}
