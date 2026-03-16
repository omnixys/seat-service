/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { SeatType } from '../../../prisma/generated/client.js';
import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateSeatInput {
  @Field(() => ID)
  eventId!: string;

  @Field(() => ID)
  sectionId!: string;

  @Field(() => ID, { nullable: true })
  tableId?: string;

  @Field(() => Int, { nullable: true })
  number?: number;

  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  note?: string;

  @Field(() => Float, { nullable: true })
  x?: number;

  @Field(() => Float, { nullable: true })
  y?: number;

  @Field(() => Float, { nullable: true })
  rotation?: number;

  @Field(() => SeatType, { defaultValue: SeatType.STANDARD, nullable: true })
  seatType?: SeatType;

  @Field(() => JsonScalar, { nullable: true })
  meta?: any;
}
