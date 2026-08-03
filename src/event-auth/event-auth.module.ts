import { SeatEventRoleResolver } from '../seat/services/seat-event-role-resolver.service.js';
import { Module } from '@nestjs/common';
import {
  EventPermissionGuard,
  EventPermissionResolver,
  EventRoleGuard,
  EventRoleResolver,
} from '@omnixys/security-ts';

@Module({
  providers: [
    EventRoleGuard,
    EventPermissionGuard,
    SeatEventRoleResolver,
    { provide: EventRoleResolver, useExisting: SeatEventRoleResolver },
    { provide: EventPermissionResolver, useExisting: SeatEventRoleResolver },
  ],
  exports: [EventRoleGuard, EventPermissionGuard, EventRoleResolver, EventPermissionResolver],
})
export class EventAuthModule {}
