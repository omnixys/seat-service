/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { SeatShape, SeatType } from '../../../prisma/generated/client.js';
import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SeatPayload {
  @Field(() => ID)
  id!: string;

  @Field()
  status!: string;

  @Field()
  eventId!: string;

  @Field()
  sectionId!: string;

  @Field({ nullable: true })
  tableId?: string;

  @Field({ nullable: true })
  number?: number;

  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  note?: string;

  @Field(() => SeatType, { defaultValue: SeatType.STANDARD, nullable: true })
  seatType?: SeatType;

  @Field(() => SeatShape, { defaultValue: SeatShape.CIRCLE })
  shape!: SeatShape;

  @Field({ nullable: true })
  x?: number;

  @Field({ nullable: true })
  y?: number;

  @Field(() => Float, { nullable: true })
  width?: number;

  @Field(() => Float, { nullable: true })
  height?: number;

  @Field(() => Float, { nullable: true })
  radius?: number;

  @Field({ nullable: true })
  rotation?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  zIndex?: number;

  @Field(() => Boolean, { defaultValue: false })
  locked!: boolean;

  @Field(() => Boolean, { defaultValue: false })
  hidden!: boolean;

  @Field(() => ID, { nullable: true })
  guestId?: string;

  @Field(() => ID, { nullable: true })
  invitationId?: string;

  @Field(() => JsonScalar, { nullable: true })
  meta?: any;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
