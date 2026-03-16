/* eslint-disable @typescript-eslint/no-explicit-any */
import { LayoutChangeType } from '../../../prisma/generated/client.js';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LogChangeInput {
  @Field()
  eventId!: string;

  @Field(() => LayoutChangeType)
  type!: LayoutChangeType;

  @Field(() => String)
  payload: any;

  @Field()
  actorId!: string;
}
