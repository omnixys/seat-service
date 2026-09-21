import { Field, Float, ID, InputType, registerEnumType } from '@nestjs/graphql';

export enum LayoutGeometryKind {
  SEAT = 'SEAT',
  TABLE = 'TABLE',
  SECTION = 'SECTION',
}

registerEnumType(LayoutGeometryKind, { name: 'LayoutGeometryKind' });

@InputType()
export class LayoutGeometryChangeInput {
  @Field(() => ID)
  id!: string;

  @Field(() => LayoutGeometryKind)
  kind!: LayoutGeometryKind;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;

  @Field(() => Float)
  width!: number;

  @Field(() => Float)
  height!: number;

  @Field(() => Float)
  rotation!: number;
}

@InputType()
export class ApplyLayoutGeometryInput {
  @Field(() => ID)
  eventId!: string;

  @Field(() => [LayoutGeometryChangeInput])
  changes!: LayoutGeometryChangeInput[];
}
