import { ScalarsModule } from '../core/scalars/scalar.module.js';
import { EventAuthModule } from '../event-auth/event-auth.module.js';
import { LayoutModule } from '../layout/layout.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SeatFieldsResolver } from './resolvers/seat-fields.resolver.js';
import { SeatMutationResolver } from './resolvers/seat-mutation.resolver.js';
import { SeatQueryResolver } from './resolvers/seat-query.resolver.js';
import { ColorGroupMatcherService } from './services/color-group-matcher.service.js';
import { SeatReadService } from './services/seat-read.service.js';
import { SeatWriteService } from './services/seat-write.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule,
    ScalarsModule,
    EventAuthModule,
    LayoutModule,
    AnalyticsModule,
  ],
  providers: [
    SeatQueryResolver,
    SeatMutationResolver,
    SeatFieldsResolver,
    ColorGroupMatcherService,
    SeatWriteService,
    SeatReadService,
  ],
  exports: [SeatWriteService, SeatReadService, ColorGroupMatcherService],
})
export class SeatModule {}
import { AnalyticsModule } from '../analytics/analytics.module.js';
