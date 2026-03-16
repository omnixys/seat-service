import { ScalarsModule } from '../core/scalars/scalar.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LayoutChangeLogMapper } from './models/mappers/layout-change-log.mapper.js';
import { LayoutVersionMapper } from './models/mappers/layout-version.mapper.js';
import { LayoutChangeLogFieldsResolver } from './resolvers/layout-change-log-fields.resolver.js';
import { LayoutMutationResolver } from './resolvers/layout-mutation.resolver.js';
import { LayoutQueryResolver } from './resolvers/layout-query.resolver.js';
import { LayoutVersionFieldsResolver } from './resolvers/layout-version-fields.resolver.js';
import { LayoutReadService } from './services/layout-read.service.js';
import { LayoutWriteService } from './services/layout-write.service.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '@omnixys/auth';

@Module({
  imports: [PrismaModule, AuthModule, ScalarsModule],
  providers: [
    // Business resolvers
    LayoutQueryResolver,
    LayoutMutationResolver,

    // Field resolvers
    LayoutVersionFieldsResolver,
    LayoutChangeLogFieldsResolver,

    // Mappers
    LayoutVersionMapper,
    LayoutChangeLogMapper,

    LayoutReadService,
    LayoutWriteService,
  ],
  exports: [LayoutVersionMapper, LayoutChangeLogMapper, LayoutReadService, LayoutWriteService],
})
export class LayoutModule {}
