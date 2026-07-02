import { PresenceState } from '../../../prisma/generated/client.js';
import {
  Field,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

registerEnumType(PresenceState, { name: 'PresenceState' });

@ObjectType()
export class SeatPresencePayload {
  @Field(() => ID)
  seatId!: string;

  @Field(() => PresenceState)
  presenceState!: PresenceState;

  @Field(() => GraphQLISODateTime, { nullable: true })
  checkedInAt?: Date | null;

  @Field(() => Boolean)
  revoked!: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  revokedAt?: Date | null;
}
