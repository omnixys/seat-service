/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { SeatType } from '../../../prisma/generated/client.js';
import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class UpdateSeatInput {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  note?: string;

  @Field(() => Int, { nullable: true })
  number?: number;

  @Field(() => SeatType, { defaultValue: SeatType.STANDARD, nullable: true })
  seatType?: SeatType;

  @Field(() => Float, { nullable: true })
  x?: number;

  @Field(() => Float, { nullable: true })
  y?: number;

  @Field(() => Float, { nullable: true })
  rotation?: number;

  @Field(() => JsonScalar, { nullable: true })
  meta?: any;
}
