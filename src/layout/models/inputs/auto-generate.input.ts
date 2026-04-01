/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import {
  SeatShape,
  SectionShape,
  TableShape,
} from '../../../prisma/generated/enums.js';
import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class SeatConfigInput {
  @Field(() => Int)
  count!: number;

  @Field({ defaultValue: SeatShape.CIRCLE })
  shape!: SeatShape;

  @Field(() => JsonScalar, { nullable: true })
  meta?: any;
}

@InputType()
export class TableConfigInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ defaultValue: TableShape.ROUND })
  shape!: TableShape;

  @Field(() => SeatConfigInput)
  seats!: SeatConfigInput;

  @Field(() => Int, { nullable: true })
  order?: number;

  @Field(() => JsonScalar, { nullable: true })
  meta?: any;
}

@InputType()
export class SectionInput {
  @Field()
  name!: string;

  @Field({ defaultValue: SectionShape.CIRCLE })
  shape!: SectionShape;

  @Field(() => [TableConfigInput])
  tables!: TableConfigInput[];

  @Field(() => Int, { nullable: true })
  order?: number;

  @Field(() => JsonScalar, { nullable: true })
  meta?: any;
}

@InputType()
export class AutoGenerateLayoutInput {
  @Field(() => ID)
  eventId!: string;

  @Field(() => [SectionInput])
  sections!: SectionInput[];

  @Field(() => Boolean, { defaultValue: true })
  adaptiveRadius!: boolean;
}
