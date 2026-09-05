/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { AssignSeatInput } from '../models/inputs/assign-seat.input.js';
import { CreateSeatInput } from '../models/inputs/create-seat.input.js';
import { UpdateSeatInput } from '../models/inputs/update-seat.input.js';
import { SeatPayload } from '../models/payloads/seat.payload.js';
import { SeatWriteService } from '../services/seat-write.service.js';
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
export class SeatMutationResolver {
  private readonly log;
  constructor(
    private readonly write: SeatWriteService,
    logger: OmnixysLogger,
  ) {
    this.log = logger.log(this.constructor.name, 'service:seat');
  }

  // ---------------------------------------------------------------------------
  // SEAT MUTATIONS
  // ---------------------------------------------------------------------------

  @Mutation(() => SeatPayload)
  async createSeat(
    @Args('input') input: CreateSeatInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.log.debug(
      'createSeat: eventId=%s | sectionId=%s',
      input.eventId,
      input.sectionId,
    );
    return this.write.createSeat(input, user.id);
  }

  @Mutation(() => SeatPayload)
  async updateSeat(
    @Args('input') input: UpdateSeatInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.log.debug('updateSeat: seatId=%s', input.id);
    return this.write.updateSeat(input, user.id);
  }

  @Mutation(() => Boolean)
  async deleteSeat(
    @Args('seatId') seatId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.log.debug('deleteSeat: seatId=%s', seatId);
    return this.write.deleteSeat(seatId, user.id);
  }

  @Mutation(() => SeatPayload)
  async assignSeat(
    @Args('input') input: AssignSeatInput,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.log.debug(
      'assignSeat: seatId=%s | guestId=%s',
      input.seatId,
      input.guestId ?? 'none',
    );
    return this.write.assignSeat(input, user.id);
  }

  @Mutation(() => SeatPayload)
  async unassignSeat(
    @Args('seatId') seatId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.log.debug('unassignSeat: seatId=%s', seatId);
    return this.write.unassignSeat(seatId, user.id);
  }
}
