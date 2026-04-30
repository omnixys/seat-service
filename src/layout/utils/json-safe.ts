/* Prisma-safe JSON helpers */
import { Prisma } from '../../prisma/generated/client.js';

export function safeJson(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    // Cast required because JsonNullClass is a valid InputJsonValue at runtime
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }

  return value;
}
