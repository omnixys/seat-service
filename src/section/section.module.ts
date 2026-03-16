import { ScalarsModule } from '../core/scalars/scalar.module.js';
import { LayoutModule } from '../layout/layout.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SectionMapper } from './models/mappers/section.mapper.js';
import { SectionFieldsResolver } from './resolvers/section-fields.resolver.js';
import { SectionMutationResolver } from './resolvers/section-mutation.resolver.js';
import { SectionQueryResolver } from './resolvers/section-query.resolver.js';
import { SectionReadService } from './services/section-read.service.js';
import { SectionWriteService } from './services/section-write.service.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '@omnixys/auth';

@Module({
  imports: [PrismaModule, AuthModule, ScalarsModule, LayoutModule],
  providers: [
    SectionQueryResolver,
    SectionMutationResolver,
    SectionReadService,
    SectionWriteService,
    // Field resolvers
    SectionFieldsResolver,

    // Mappers
    SectionMapper,
  ],
  exports: [SectionReadService, SectionWriteService],
})
export class SectionModule {}
