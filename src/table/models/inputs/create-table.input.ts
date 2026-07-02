/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { TableShape } from '../../../prisma/generated/enums.js';
import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateTableInput {
  @Field(() => ID)
  eventId!: string;

  @Field()
  sectionId!: string;

  @Field()
  name!: string;

  @Field(() => Int, { nullable: true })
  order?: number;

  @Field(() => Int, { nullable: true })
  capacity?: number;

  @Field(() => TableShape, { nullable: true })
  shape?: TableShape;

  @Field(() => Float, { nullable: true })
  x?: number;

  @Field(() => Float, { nullable: true })
  y?: number;

  @Field(() => Float, { nullable: true })
  width?: number;

  @Field(() => Float, { nullable: true })
  height?: number;

  @Field(() => Float, { nullable: true })
  rotation?: number;

  @Field(() => JsonScalar, { nullable: true })
  meta?: any;
}
