/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { SectionShape } from '../../../prisma/generated/client.js';
import { Field, Float, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SectionPayload {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field()
  name!: string;

  @Field()
  order!: number;

  @Field({ nullable: true })
  capacity?: number;

  @Field(() => SectionShape, { defaultValue: SectionShape.RECTANGLE })
  shape!: SectionShape;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;

  @Field(() => Float, { nullable: true })
  width?: number;

  @Field(() => Float, { nullable: true })
  height?: number;

  @Field(() => Float, { nullable: true })
  rotation?: number;

  @Field(() => JsonScalar)
  meta!: any;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
  })
  updatedAt?: Date | undefined;
}
