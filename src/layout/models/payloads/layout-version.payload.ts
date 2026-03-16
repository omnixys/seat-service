/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LayoutVersionPayload {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  eventId!: string;

  @Field()
  version!: number;

  @Field({ nullable: true })
  label?: string;

  @Field(() => JsonScalar)
  data!: any;

  @Field(() => JsonScalar, { nullable: true })
  patch?: any;

  @Field(() => JsonScalar, { nullable: true })
  inversePatch?: any;

  @Field()
  createdAt!: Date;
}
