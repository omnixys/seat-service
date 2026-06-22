import { PrismaService } from '../../prisma/prisma.service.js';
import { SectionMapper } from '../../section/models/mappers/section.mapper.js';
import { SectionPayload } from '../../section/models/payloads/section.payload.js';
import { TableMapper } from '../../table/models/mappers/table.mapper.js';
import { TablePayload } from '../../table/models/payloads/table.payload.js';
import { SeatingEntityNotFoundException } from '../errors/seat-domain.error.js';
import { SeatPayload } from '../models/payloads/seat.payload.js';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';

@Resolver(() => SeatPayload)
export class SeatFieldsResolver {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------
  // SECTION (Seat.sectionId -> SectionPayload)
  // ------------------------------------------------------
  @ResolveField(() => SectionPayload)
  async section(@Parent() seat: SeatPayload): Promise<SectionPayload> {
    const sec = await this.prisma.section.findUnique({
      where: { id: seat.sectionId },
    });

    // Prisma return is guaranteed (onDelete Cascade), but type safety:
    if (!sec) {
      throw new SeatingEntityNotFoundException('section', seat.sectionId);
    }

    return SectionMapper.toPayload(sec);
  }

  // ------------------------------------------------------
  // TABLE (Seat.tableId -> TablePayload | null)
  // ------------------------------------------------------
  @ResolveField(() => TablePayload, { nullable: true })
  async table(@Parent() seat: SeatPayload): Promise<TablePayload | null> {
    if (!seat.tableId) {
      return null;
    }

    const table = await this.prisma.table.findUnique({
      where: { id: seat.tableId },
    });

    if (!table) {
      return null;
    }

    return TableMapper.toPayload(table);
  }
}
