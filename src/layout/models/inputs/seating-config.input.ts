/* eslint-disable @typescript-eslint/no-explicit-any */
import { ShapeType } from '../enums/shape.enum.js';
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
  @Field(() => ShapeType, { nullable: true })
  sectionForm?: ShapeType;

  @Field(() => ShapeType, { nullable: true })
  tableForm?: ShapeType;

  @Field(() => ShapeType, { nullable: true })
  seatForm?: ShapeType;

  // META (required by your generator)
  @Field(() => SeatingMetaConfigInput, { nullable: true })
  meta?: SeatingMetaConfigInput;

  // GLOBAL FORM (your previous version)
  @Field(() => ShapeType, { nullable: true, defaultValue: ShapeType.CIRCLE })
  form?: ShapeType;
}
