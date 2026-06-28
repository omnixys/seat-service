import { Module } from '@nestjs/common';
import { EventRoleGuard, EventRoleResolver } from '@omnixys/security';
import { SeatEventRoleResolver } from '../seat/services/seat-event-role-resolver.service.js';

@Module({
  providers: [
    EventRoleGuard,
    SeatEventRoleResolver,
    { provide: EventRoleResolver, useExisting: SeatEventRoleResolver },
  ],
  exports: [EventRoleGuard, EventRoleResolver],
})
export class EventAuthModule {}
