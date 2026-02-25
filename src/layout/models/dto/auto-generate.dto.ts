import type { SeatingConfigInput } from '../inputs/seating-config.input.js';

export interface AutoGenerateLayoutDTO {
  eventId: string;
  config?: SeatingConfigInput;
  maxSeats: number;
  actorId: string;
}
