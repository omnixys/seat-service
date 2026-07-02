import { SeatAccessDeniedException } from '../errors/seat-domain.error.js';
import { GuestEventSeatInput } from '../models/inputs/guest-event-seat.input.js';
import { SeatAssignmentLogPayload } from '../models/payloads/seat-assignment-log.payload.js';
import { SeatPresencePayload } from '../models/payloads/seat-presence.payload.js';
import { SeatPayload } from '../models/payloads/seat.payload.js';
import { SeatReadService } from '../services/seat-read.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { EventRoleType, RealmRoleType } from '@omnixys/contracts';
import {
  EventRoleResolver,
  isOwnerOrEventAdmin,
  EventRoles,
  RoleGuard,
  Roles,
  EventRoleGuard,
} from '@omnixys/security';
import {
  CookieAuthGuard,
  CurrentUser,
  type CurrentUserData,
} from '@omnixys/security';

@Resolver()
@UseGuards(CookieAuthGuard)
export class SeatQueryResolver {
  constructor(
    private readonly read: SeatReadService,
    private readonly eventRoleResolver: EventRoleResolver,
  ) {}

  @Query(() => [SeatPayload])
  async seatsBySection(
    @Args('sectionId', { type: () => ID }) sectionId: string,
  ): Promise<SeatPayload[]> {
    return this.read.getSeatsBySection(sectionId);
  }

  @Query(() => [SeatPayload])
  async seatsByTable(
    @Args('tableId', { type: () => ID }) tableId: string,
  ): Promise<SeatPayload[]> {
    return this.read.getSeatsByTable(tableId);
  }

  @Query(() => SeatPayload, { nullable: true })
  async seat(@Args('id', { type: () => ID }) id: string): Promise<SeatPayload> {
    return this.read.getSeatById(id);
  }

  @Query(() => [SeatAssignmentLogPayload])
  async seatAssignmentLogs(
    @Args('eventId') eventId: string,
  ): Promise<SeatAssignmentLogPayload[]> {
    return this.read.getSeatAssignmentLogs(eventId);
  }

  @Query(() => [SeatPayload])
  async seats(
    @Args('eventId', { type: () => ID }) eventId: string,
  ): Promise<SeatPayload[]> {
    return this.read.getSeatsByEvent(eventId);
  }

  @Query(() => [SeatPayload])
  async getSeatList(
    @Args('seatIds', { type: () => [ID] }) seatIds: string[],
  ): Promise<SeatPayload[]> {
    return this.read.getSeatsByIds(seatIds);
  }

  @Query(() => [SeatPresencePayload])
  @UseGuards(CookieAuthGuard, RoleGuard, EventRoleGuard)
  @Roles(RealmRoleType.USER)
  @EventRoles(EventRoleType.ADMIN, EventRoleType.SECURITY)
  async seatPresencesByEvent(
    @Args('eventId', { type: () => ID }) eventId: string,
  ): Promise<SeatPresencePayload[]> {
    return this.read.getSeatPresencesByEvent(eventId);
  }

  @Query(() => SeatPayload)
  async getSeatByGuestAndEvent(
    @Args('input', { type: () => GuestEventSeatInput })
    input: GuestEventSeatInput,
    @CurrentUser() user: CurrentUserData,
  ): Promise<SeatPayload> {
    const eventRole = await this.eventRoleResolver.getRoleForUser(
      user.id,
      input.eventId,
    );
    if (!isOwnerOrEventAdmin(input.guestId, user.id, eventRole)) {
      throw new SeatAccessDeniedException('guest-owner-mismatch');
    }
    return this.read.getSeatByEventAndGuest(input);
  }
}
