/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { TableShape } from '../../../prisma/generated/enums.js';
import { Field, ID, InputType, Int, Float } from '@nestjs/graphql';

@InputType()
export class UpdateTableInput {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  name?: string;

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
