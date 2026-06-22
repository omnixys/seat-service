import { ContextAccessor } from '@omnixys/context';
import {
  FrameworkException,
  SeatNotFoundException as ContractSeatNotFoundException,
  type FrameworkExceptionOptions,
} from '@omnixys/contracts';

function options(
  metadata: Readonly<Record<string, unknown>> = {},
  cause?: unknown,
): FrameworkExceptionOptions {
  const context = ContextAccessor.get();
  return {
    cause,
    context: {
      requestId: context?.requestId,
      correlationId: context?.correlationId,
      traceId: context?.trace?.traceId,
      actorId: context?.principal?.actorId,
      tenantId: context?.tenant?.tenantId ?? context?.principal?.tenantId,
    },
    metadata,
  };
}

export class SeatNotFoundException extends ContractSeatNotFoundException {
  constructor(seatId?: string) {
    super(seatId, options());
  }
}

export class SeatDomainException extends FrameworkException {
  constructor(
    code: string,
    message: string,
    metadata: Readonly<Record<string, unknown>> = {},
    cause?: unknown,
  ) {
    super(code, message, options(metadata, cause));
  }
}

export class SeatUnavailableException extends SeatDomainException {
  constructor(eventId: string, seatId?: string) {
    super('SEAT_UNAVAILABLE', 'No matching available seat could be assigned', {
      eventId,
      seatId,
    });
  }
}

export class SeatAssignmentNotFoundException extends SeatDomainException {
  constructor(eventId: string, guestId: string) {
    super('SEAT_ASSIGNMENT_NOT_FOUND', 'Seat assignment was not found', {
      eventId,
      guestId,
    });
  }
}

export class SeatAccessDeniedException extends SeatDomainException {
  constructor(reason = 'insufficient-permission') {
    super('SEAT_ACCESS_DENIED', 'Seat access is not authorized', { reason });
  }
}

export class SeatingEntityNotFoundException extends SeatDomainException {
  constructor(entity: 'section' | 'table' | 'layout-version', id?: string) {
    super(
      `${entity.replace('-', '_').toUpperCase()}_NOT_FOUND`,
      `${entity} was not found`,
      {
        entity,
        id,
      },
    );
  }
}

export class SeatingConflictException extends SeatDomainException {
  constructor(entity: 'section' | 'table', message: string) {
    super(`${entity.toUpperCase()}_CONFLICT`, message, { entity });
  }
}

export class SeatEventMismatchException extends SeatDomainException {
  constructor(seatId: string, eventId: string, actualEventId: string) {
    super(
      'SEAT_EVENT_MISMATCH',
      'Seat does not belong to the requested event',
      {
        seatId,
        eventId,
        actualEventId,
      },
    );
  }
}

export class SeatVerificationTokenException extends SeatDomainException {
  constructor(
    reason: 'invalid-token' | 'assignment-not-found',
    options: { cause?: unknown } = {},
  ) {
    super(
      'SEAT_VERIFICATION_TOKEN_INVALID',
      'Guest seat verification state is invalid or expired',
      { reason },
      options.cause,
    );
  }
}
