import { SectionShape, TableShape } from '../../../prisma/generated/enums.js';
import { Field, ID, InputType, Int, Float } from '@nestjs/graphql';

@InputType()
export class AutoGenerateSeatMapInput {
  @Field(() => ID)
  eventId!: string;

  @Field()
  sectionName!: string;

  @Field(() => Int)
  seatCount!: number;

  @Field(() => Int)
  tableCount!: number;

  @Field(() => TableShape, { defaultValue: TableShape.ROUND })
  tableShape!: TableShape;

  @Field(() => SectionShape, { defaultValue: SectionShape.CIRCLE })
  sectionLayout!: SectionShape;

  @Field(() => Float, { nullable: true })
  spacing?: number;
}
