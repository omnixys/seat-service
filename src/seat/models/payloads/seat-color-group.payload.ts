import {
  ObjectType,
  Field,
  Int,
  registerEnumType,
  Directive,
} from '@nestjs/graphql';

export enum SeatColorGroupMatchType {
  SINGLE = 'SINGLE',
  CUSTOM = 'CUSTOM',
  ALL = 'ALL',
  NONE = 'NONE',
}

registerEnumType(SeatColorGroupMatchType, {
  name: 'SeatColorGroupMatchType',
});

@ObjectType()
@Directive('@shareable')
export class SeatColorGroupStyle {
  @Field()
  background!: string;

  @Field()
  foreground!: string;

  @Field()
  border!: string;

  @Field()
  legendIcon!: string;
}

@ObjectType()
@Directive('@shareable')
export class SeatColorGroupPayload {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field(() => SeatColorGroupStyle)
  style!: SeatColorGroupStyle;

  @Field(() => SeatColorGroupMatchType)
  matchType!: SeatColorGroupMatchType;

  @Field(() => [String])
  invitedByValues!: string[];

  @Field(() => Int)
  priority!: number;

  @Field(() => Int)
  order!: number;

  @Field()
  isOrphaned!: boolean;
}
