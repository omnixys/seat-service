import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class AssignSeatDTO {
  @Field(() => ID, { nullable: true })
  seatId?: string;

  @Field(() => ID)
  guestId!: string;

  @Field(() => ID, { nullable: true })
  invitationId?: string;

  @Field(() => ID)
  eventId!: string;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => ID)
  actorId!: string;
}
