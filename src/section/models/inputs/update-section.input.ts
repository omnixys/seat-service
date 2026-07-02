/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { SectionShape } from '../../../prisma/generated/enums.js';
import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class UpdateSectionInput {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  name?: string;

  @Field(() => Int, { nullable: true })
  order?: number;

  @Field(() => Int, { nullable: true })
  capacity?: number;

  @Field(() => SectionShape, { nullable: true })
  shape?: SectionShape;

  @Field(() => Float, { nullable: true })
  x?: number;

  @Field(() => Float, { nullable: true })
  y?: number;

  @Field(() => Float, { nullable: true })
  width?: number;

  @Field(() => Float, { nullable: true })
  height?: number;

  @Field(() => JsonScalar, { nullable: true })
  meta?: any;
}
