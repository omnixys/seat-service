import { SeatShape } from '../../../prisma/generated/client.js';
import { circleShape } from './circle.shape.js';
// import { galaShape } from './gala.shape.js';
// import { gridShape } from './grid.shape.js';
// import { horseshoeShape } from './horseshoe.shape.js';
// import { scatterShape } from './scatter.shape.js';
// import { spiralShape } from './spiral.shape.js';
// import { uShape } from './u.shape.js';
// import { vipShape } from './vip.shape.js';

export const shapeRegistry = {
  [SeatShape.CIRCLE]: circleShape,
  // [SeatShape.RECTANGLE]:
  // [SeatShape.SQUARE]:
  // [ShapeType.GALA]: galaShape,
  // [ShapeType.GRID]: gridShape,
  // [ShapeType.U]: uShape,
  // [ShapeType.U_FORM]: uShape,
  // [ShapeType.HORSESHOE]: horseshoeShape,
  // [ShapeType.SCATTER]: scatterShape,
  // [ShapeType.VIP]: vipShape,
  // [ShapeType.SPIRAL]: spiralShape,
} as const;
