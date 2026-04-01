import { ScalarsModule } from '../core/scalars/scalar.module.js';
import { LayoutModule } from '../layout/layout.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SeatFieldsResolver } from './resolvers/seat-fields.resolver.js';
import { SeatMutationResolver } from './resolvers/seat-mutation.resolver.js';
import { SeatQueryResolver } from './resolvers/seat-query.resolver.js';
import { SeatReadService } from './services/seat-read.service.js';
import { SeatWriteService } from './services/seat-write.service.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '@omnixys/security';

@Module({
  imports: [PrismaModule, AuthModule, ScalarsModule, LayoutModule],
  providers: [
    SeatQueryResolver,
    SeatMutationResolver,
    SeatFieldsResolver,
    SeatWriteService,
    SeatReadService,
  ],
  exports: [SeatWriteService, SeatReadService],
})
export class SeatModule {}
