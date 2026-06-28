/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { AssignSeatInput } from '../models/inputs/assign-seat.input.js';
import { CreateSeatInput } from '../models/inputs/create-seat.input.js';
import { UpdateSeatInput } from '../models/inputs/update-seat.input.js';
import { SeatPayload } from '../models/payloads/seat.payload.js';
import { SeatWriteService } from '../services/seat-write.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { EventRoleType, RealmRoleType } from '@omnixys/contracts';
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
export class SeatMutationResolver {
  constructor(private readonly write: SeatWriteService) {}

  // ---------------------------------------------------------------------------
  // SEAT MUTATIONS
  // ---------------------------------------------------------------------------

  @Mutation(() => SeatPayload)
  async createSeat(
    @Args('input') input: CreateSeatInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.write.createSeat(input, user.id);
  }

  @Mutation(() => SeatPayload)
  async updateSeat(
    @Args('input') input: UpdateSeatInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.write.updateSeat(input, user.id);
  }

  @Mutation(() => Boolean)
  async deleteSeat(
    @Args('seatId') seatId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.write.deleteSeat(seatId, user.id);
  }

  @Mutation(() => SeatPayload)
  async assignSeat(
    @Args('input') input: AssignSeatInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.write.assignSeat(input, user.id);
  }

  @Mutation(() => SeatPayload)
  async unassignSeat(
    @Args('seatId') seatId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.write.unassignSeat(seatId, user.id);
  }
}
