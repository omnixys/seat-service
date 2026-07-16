import { PrismaService } from '../../prisma/prisma.service.js';
import { SeatAccessDeniedException } from '../errors/seat-domain.error.js';
import { GuestEventSeatInput } from '../models/inputs/guest-event-seat.input.js';
import { SeatAssignmentLogPayload } from '../models/payloads/seat-assignment-log.payload.js';
import { SeatPresencePayload } from '../models/payloads/seat-presence.payload.js';
import { SeatPayload } from '../models/payloads/seat.payload.js';
import { SeatReadService } from '../services/seat-read.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { EventPermissionKey, RealmRoleType } from '@omnixys/contracts';
import {
  EventPermissionGuard,
  EventPermissionResolver,
  EventPermissions,
  EventRoleResolver,
  RoleGuard,
  Roles,
  isOwnerOrEventAdmin,
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
    private readonly permissionResolver: EventPermissionResolver,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [SeatPayload])
  async seatsBySection(
    @Args('sectionId', { type: () => ID }) sectionId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<SeatPayload[]> {
    const eventId = await this.resolveEventIdForSection(sectionId);
    await this.requireViewSeats(eventId, user.id);
    return this.read.getSeatsBySection(sectionId);
  }

  @Query(() => [SeatPayload])
  async seatsByTable(
    @Args('tableId', { type: () => ID }) tableId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<SeatPayload[]> {
    const eventId = await this.resolveEventIdForTable(tableId);
    await this.requireViewSeats(eventId, user.id);
    return this.read.getSeatsByTable(tableId);
  }

  @Query(() => SeatPayload, { nullable: true })
  async seat(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<SeatPayload> {
    const eventId = await this.resolveEventIdForSeat(id);
    await this.requireViewSeats(eventId, user.id);
    return this.read.getSeatById(id);
  }

  @Query(() => [SeatAssignmentLogPayload])
  @UseGuards(CookieAuthGuard, RoleGuard, EventPermissionGuard)
  @Roles(RealmRoleType.USER)
  @EventPermissions(EventPermissionKey.ViewSeats)
  async seatAssignmentLogs(
    @Args('eventId') eventId: string,
  ): Promise<SeatAssignmentLogPayload[]> {
    return this.read.getSeatAssignmentLogs(eventId);
  }

  @Query(() => [SeatPayload])
  @UseGuards(CookieAuthGuard, RoleGuard, EventPermissionGuard)
  @Roles(RealmRoleType.USER)
  @EventPermissions(EventPermissionKey.ViewSeats)
  async seats(
    @Args('eventId', { type: () => ID }) eventId: string,
  ): Promise<SeatPayload[]> {
    return this.read.getSeatsByEvent(eventId);
  }

  @Query(() => [SeatPayload])
  async getSeatList(
    @Args('seatIds', { type: () => [ID] }) seatIds: string[],
    @CurrentUser() user: CurrentUserData,
  ): Promise<SeatPayload[]> {
    if (seatIds.length > 0) {
      const first = seatIds[0];
      if (!first) {
        return this.read.getSeatsByIds(seatIds);
      }
      const eventId = await this.resolveEventIdForSeat(first);
      await this.requireViewSeats(eventId, user.id);
    }
    return this.read.getSeatsByIds(seatIds);
  }

  @Query(() => [SeatPresencePayload])
  @UseGuards(CookieAuthGuard, RoleGuard, EventPermissionGuard)
  @Roles(RealmRoleType.USER)
  @EventPermissions(EventPermissionKey.ViewSeats)
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

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async requireViewSeats(
    eventId: string,
    userId: string,
  ): Promise<void> {
    const permissions = await this.permissionResolver.getPermissionsForUser(
      userId,
      eventId,
    );
    if (!permissions.includes(EventPermissionKey.ViewSeats)) {
      throw new SeatAccessDeniedException('seats-view-required');
    }
  }

  private async resolveEventIdForSection(sectionId: string): Promise<string> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { eventId: true },
    });
    if (!section) {
      throw new SeatAccessDeniedException('section-not-found');
    }
    return section.eventId;
  }

  private async resolveEventIdForTable(tableId: string): Promise<string> {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      select: { eventId: true },
    });
    if (!table) {
      throw new SeatAccessDeniedException('table-not-found');
    }
    return table.eventId;
  }

  private async resolveEventIdForSeat(seatId: string): Promise<string> {
    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
      select: { eventId: true },
    });
    if (!seat) {
      throw new SeatAccessDeniedException('seat-not-found');
    }
    return seat.eventId;
  }
}
