/* eslint-disable @typescript-eslint/switch-exhaustiveness-check */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Scalar } from '@nestjs/graphql';
import { GraphQLScalarType, Kind, ValueNode } from 'graphql';

function parseLiteral(ast: ValueNode): any {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;

    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);

    case Kind.OBJECT: {
      const obj: Record<string, any> = {};
      for (const field of ast.fields) {
        obj[field.name.value] = parseLiteral(field.value);
      }
      return obj;
    }

    case Kind.LIST:
      return ast.values.map((v) => parseLiteral(v));

    default:
      return null;
  }
}

const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  parseValue: (value) => value,
  serialize: (value) => value,
  parseLiteral,
});

@Scalar('JSON')
export class JsonScalar {
  description = 'JSON custom scalar type';

  getGraphQLScalarType(): GraphQLScalarType {
    return jsonScalar;
  }
}
