# Omnixys Seat Service

The Seat Service owns venue sections, tables, seats, layout geometry, assignment history, and layout versions. It exposes a federated GraphQL API and connects verified guests to the Ticket workflow through Kafka.

## Ownership boundaries

This service owns:

- sections, tables, and seats for an event reference;
- seat availability, reservation, and assignment state;
- guest and invitation assignment references;
- layout geometry, metadata, change logs, undo/redo patches, and snapshots;
- deterministic grid, circle, gala, horseshoe, scatter, spiral, U, and VIP layout generation.

It does not own events, invitations, user identities, or tickets. `eventId`, `invitationId`, and `guestId` are foreign identifiers only. Ticket creation remains owned by the Ticket service.

## Architecture

```text
HTTP / GraphQL
      |
      v
Context + Security + Validation
      |
      v
Layout / Section / Table / Seat services ---> PostgreSQL
                    |
                    `------------------------> Valkey verification state
                                               |
                                               v
Kafka: Authentication -> Seat -> Ticket
```

The service consumes canonical request metadata from `@omnixys/context`. Structured logs, errors, traces, and Kafka headers therefore share request, correlation, actor, tenant, and trace identifiers.

## Guest assignment flow

1. Authentication publishes `seat.addGuestId` after guest verification.
2. The handler decrypts and validates the short-lived seat key.
3. The service finds the assignment for the invitation.
4. An explicit reserved seat is claimed for that invitation, or the first available seat in the same event is selected.
5. A database compare-and-set prevents concurrent handlers from claiming the same seat.
6. Assignment and audit records are persisted.
7. A short-lived ticket mapping is written to Valkey and `ticket.create` is published.

Redelivery is safe: an existing matching event/guest/invitation assignment is returned. A conflicting or concurrently claimed seat produces `SEAT_UNAVAILABLE`, allowing the Kafka package to apply retry and dead-letter policy.

Removing a user consumes `seat.removeGuestId` and unassigns every seat owned by that guest. The previous implementation treated the user ID as a seat ID; this service now resolves the guest's seats explicitly.

## GraphQL security

- all queries require authentication;
- all layout, section, table, seat, and assignment mutations require the `ADMIN` realm role;
- guest/event lookup permits the owner or an administrator;
- administrative process endpoints require the `ADMIN` role.

Event-specific authorization can later be refined with a canonical event-role policy. Until then, platform administration is intentionally stricter than accepting any authenticated user.

## Layout model

Sections contain tables and/or seats. Tables contain seats. Geometry is stored as coordinates, dimensions, rotation, shape, z-index, and JSON metadata. Cascades remove child layout objects when their parent is deleted.

Layout versioning is already implemented through `LayoutVersion`, forward/inverse JSON patches, and change logs. The previous TODO for layout versioning is therefore complete. “Smart seating” is represented by deterministic, auditable generation strategies; opaque AI placement is not introduced into this transactional service. A Next.js Auto-Seating Wizard belongs to the frontend repository and should consume the GraphQL layout APIs.

## Interfaces

### GraphQL

The API provides section, table, seat, and full-layout queries; assignment history and event statistics; CRUD operations; assignment mutations; layout generation, movement, duplication, versioning, undo, and redo.

### HTTP health

- `GET /health/liveness` checks the process.
- `GET /health/readiness` checks Kafka, Valkey, and configured external dependencies.

### Kafka

Consumed:

| Topic registry key   | Responsibility                         |
| -------------------- | -------------------------------------- |
| `seat.create`        | Generate an initial event layout       |
| `seat.delete`        | Delete layouts for removed events      |
| `seat.addGuestId`    | Resolve and assign a verified guest    |
| `seat.removeGuestId` | Remove assignments for a deleted guest |

Produced:

| Topic registry key | Responsibility                                      |
| ------------------ | --------------------------------------------------- |
| `ticket.create`    | Trigger idempotent ticket creation after assignment |

Handlers await all work so retry and dead-letter behavior can observe failures.

## Persistence and migrations

PostgreSQL stores layout and assignment state. Database columns remain snake_case; `seatType` maps to the existing `seat_type` column. Do not deploy a migration that drops and recreates this column because it would destroy seat-type data.

```bash
pnpm prisma migrate deploy
```

## Local development

Requirements: Node.js 24.10+, pnpm 11.1+, PostgreSQL, Kafka, Valkey, and a compatible JWT issuer.

```bash
cp .env.example .env
pnpm install
pnpm prisma migrate dev
pnpm dev
```

Production requires database, cookie, Keycloak client, Valkey, pending-contact, and service encryption secrets.

## Validation

```bash
pnpm prisma validate
pnpm build
pnpm test:unit
pnpm test:e2e
pnpm lint
pnpm pack --dry-run
```

Unit tests cover event-scoped automatic assignment, compare-and-set races, verification-state validation, and canonical Kafka metadata. Resolver integration tests cover layout, section, table, and seat query/mutation delegation without external infrastructure.

## Operations

Nest shutdown hooks close Kafka, Valkey, telemetry, logging, and Prisma. Optional external readiness URLs are disabled when empty. Framework exceptions expose stable codes and canonical diagnostic identifiers.

## License

GPL-3.0-or-later. See [.github/LICENSE](.github/LICENSE).
