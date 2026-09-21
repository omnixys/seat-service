import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class AppendTableSeatsInput {
  @Field(() => ID)
  tableId!: string;

  @Field(() => Int)
  count!: number;
}
