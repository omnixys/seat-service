/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SeatShape,
  SectionShape,
  TableShape,
} from '../../../prisma/generated/client.js';
import { Field, InputType, Int } from '@nestjs/graphql';

// ========= SIMPLE MODE ==========
@InputType()
export class SimpleSeatingConfigInput {
  @Field(() => Int)
  sections!: number;

  @Field(() => Int)
  tables!: number;

  @Field(() => Int, { nullable: true })
  seats?: number; // auto distribute
}

// ========= CUSTOM MODE ==========
@InputType()
export class CustomSectionConfigInput {
  @Field()
  name!: string;

  @Field(() => Int)
  tables!: number;
}

@InputType()
export class CustomTableConfigInput {
  @Field()
  name!: string;

  @Field(() => Int, { nullable: true })
  seats?: number;
}

// ========= META CONFIG ==========
@InputType()
export class SeatingMetaConfigInput {
  @Field(() => Object, { nullable: true })
  section?: Record<string, any>;

  @Field(() => Object, { nullable: true })
  table?: Record<string, any>;

  @Field(() => Object, { nullable: true })
  seat?: Record<string, any>;
}

// ========= MAIN INPUT ==========
@InputType()
export class SeatingConfigInput {
  // SIMPLE
  @Field(() => SimpleSeatingConfigInput, { nullable: true })
  simple?: SimpleSeatingConfigInput;

  // CUSTOM
  @Field(() => [CustomSectionConfigInput], { nullable: true })
  sections?: CustomSectionConfigInput[];

  @Field(() => [CustomTableConfigInput], { nullable: true })
  tables?: CustomTableConfigInput[];

  // SHAPES (required by your service file)
  @Field(() => SectionShape, { nullable: true })
  sectionForm?: SectionShape;

  @Field(() => TableShape, { nullable: true })
  tableForm?: TableShape;

  @Field(() => SeatShape, { nullable: true })
  seatForm?: SeatShape;

  // META (required by your generator)
  @Field(() => SeatingMetaConfigInput, { nullable: true })
  meta?: SeatingMetaConfigInput;
}
