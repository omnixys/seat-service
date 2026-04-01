import { ScalarsModule } from '../core/scalars/scalar.module.js';
import { LayoutModule } from '../layout/layout.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TableMapper } from './models/mappers/table.mapper.js';
import { TableFieldsResolver } from './resolvers/table-fields.resolver.js';
import { TableMutationResolver } from './resolvers/table-mutation.resolver.js';
import { TableQueryResolver } from './resolvers/table-query.resolver.js';
import { TableReadService } from './services/table-read.service.js';
import { TableWriteService } from './services/table-write.service.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '@omnixys/security';

@Module({
  imports: [PrismaModule, AuthModule, ScalarsModule, LayoutModule],
  providers: [
    TableQueryResolver,
    TableMutationResolver,
    TableWriteService,
    TableReadService,
    // Field resolvers
    TableFieldsResolver,

    // Mappers
    TableMapper,
  ],
  exports: [TableMapper, TableWriteService, TableReadService],
})
export class TableModule {}
