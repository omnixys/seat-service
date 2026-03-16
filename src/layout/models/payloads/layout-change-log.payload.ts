/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { LayoutChangeType } from '../../../prisma/generated/client.js';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LayoutChangeLogPayload {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  eventId!: string;

  @Field(() => ID)
  actorId!: string;

  @Field(() => LayoutChangeType)
  type!: LayoutChangeType;

  @Field(() => JsonScalar)
  payload!: any;

  @Field()
  createdAt!: Date;
}
