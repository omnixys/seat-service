/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { TableShape } from '../../../prisma/generated/client.js';
import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TablePayload {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field()
  sectionId!: string;

  @Field()
  name!: string;

  @Field()
  order!: number;

  @Field({ nullable: true })
  capacity?: number;

  @Field(() => TableShape, { defaultValue: TableShape.RECTANGLE })
  shape!: TableShape;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;

  @Field(() => Float, { nullable: true, defaultValue: 0 })
  rotation?: number;

  @Field(() => JsonScalar)
  meta!: any;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
