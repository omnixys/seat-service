import { PrismaService } from '../../prisma/prisma.service.js';
import { SeatingEntityNotFoundException } from '../../seat/errors/seat-domain.error.js';
import { SeatMapper } from '../../seat/models/mappers/seat.mapper.js';
import { SeatPayload } from '../../seat/models/payloads/seat.payload.js';
import { SectionMapper } from '../../section/models/mappers/section.mapper.js';
import { SectionPayload } from '../../section/models/payloads/section.payload.js';
import { TablePayload } from '../models/payloads/table.payload.js';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';

@Resolver(() => TablePayload)
export class TableFieldsResolver {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------
  // SECTION
  // ------------------------------------------------------
  @ResolveField(() => SectionPayload)
  async section(@Parent() table: TablePayload): Promise<SectionPayload> {
    const sec = await this.prisma.section.findUnique({
      where: { id: table.sectionId },
    });

    if (!sec) {
      throw new SeatingEntityNotFoundException('section', table.sectionId);
    }

    return SectionMapper.toPayload(sec);
  }

  // ------------------------------------------------------
  // SEATS[]
  // ------------------------------------------------------
  @ResolveField(() => [SeatPayload])
  async seats(@Parent() table: TablePayload): Promise<SeatPayload[]> {
    const seats = await this.prisma.seat.findMany({
      where: { tableId: table.id },
      orderBy: { number: 'asc' },
    });

    return SeatMapper.toPayloadList(seats);
  }
}
