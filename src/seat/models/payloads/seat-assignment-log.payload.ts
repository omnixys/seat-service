/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { SeatAssignmentAction } from '../../../prisma/generated/client.js';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SeatAssignmentLogPayload {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  eventId!: string;

  @Field(() => ID)
  seatId!: string;

  @Field(() => ID, { nullable: true })
  guestId?: string;

  @Field(() => ID, { nullable: true })
  invitationId?: string;

  @Field(() => SeatAssignmentAction)
  action!: SeatAssignmentAction;

  @Field(() => JsonScalar, { nullable: true })
  data?: any;

  @Field()
  createdAt!: Date;
}
