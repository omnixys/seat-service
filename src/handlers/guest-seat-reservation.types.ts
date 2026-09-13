/**
 * Guest seat reservation contract between the Invitation and Seat services.
 *
 * The topic names and payload shapes below are a local, explicit contract.
 * They belong in `@omnixys/kafka-ts` / `@omnixys/contracts-ts` on the next
 * shared-package release; until then they are defined identically in both
 * services so no published dependency has to change.
 *
 * Flow (invitation → seat → invitation):
 *   seat.reserve            { eventId, invitationId, actorId }   (invitation publishes)
 *   seat.reserved           { eventId, invitationId, seatId }    (seat publishes on success)
 *   seat.reservationFailed  { eventId, invitationId }            (seat publishes when no seat is free)
 */
export const SEAT_RESERVE_TOPIC = 'seat.reserve';
export const SEAT_RESERVED_TOPIC = 'seat.reserved';
export const SEAT_RESERVATION_FAILED_TOPIC = 'seat.reservationFailed';

export interface SeatReserveDTO {
  eventId: string;
  invitationId: string;
  actorId?: string;
}

export interface SeatReservedDTO {
  eventId: string;
  invitationId: string;
  seatId: string;
  actorId?: string;
}

export interface SeatReservationFailedDTO {
  eventId: string;
  invitationId: string;
}

/**
 * Type-level registration for the local guest-seat-reservation topics so the
 * typed Kafka producer and the `@KafkaEvent` decorator accept them until the
 * contract moves into `@omnixys/kafka-ts` / `@omnixys/contracts-ts`.
 */
declare module '@omnixys/kafka-ts' {
  interface KafkaEventRegistry {
    [SEAT_RESERVE_TOPIC]: SeatReserveDTO;
    [SEAT_RESERVED_TOPIC]: SeatReservedDTO;
    [SEAT_RESERVATION_FAILED_TOPIC]: SeatReservationFailedDTO;
  }
}
