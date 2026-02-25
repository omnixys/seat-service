/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ShapeOptions } from '../layout/utils/shape/type.js';
import type { Prisma } from '../prisma/generated/client.js';

/**
 * Default metadata applied to ALL seat entities
 * Section, Table, Seat share these default layout/UI attributes.
 */
export const DEFAULT_META = {
  color: '#6A4BBC', // Primary visual color
  visible: true, // Render/visibility flag
  locked: false, // Whether the element can be moved/edited
  spacing: 50, // Default spacing for grid-like layouts
  radius: 120, // Default radius for circular layouts
  shape: 'circle', // Default shape representation
};

/**
 * Performs a deep merge between default meta and user-input meta.
 * All missing fields are filled from DEFAULT_META.
 */
export function deepMergeMeta(base: any, override: any): Prisma.JsonObject {
  if (!override) {
    return base;
  }

  const result: any = { ...base };

  for (const key of Object.keys(override)) {
    const isObject =
      typeof override[key] === 'object' &&
      override[key] !== null &&
      !Array.isArray(override[key]);

    if (isObject) {
      result[key] = deepMergeMeta(result[key] ?? {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }

  return result;
}

/**
 * Prepares metadata for Prisma inserts by deep-merging overrides with defaults.
 */
export function prepareMeta(inputMeta: any): ShapeOptions {
  return deepMergeMeta(DEFAULT_META, inputMeta);
}
