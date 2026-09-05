# TURNOS SaaS → TURNOS Core API v1

This document defines the boundary used by the `/demo` and future public booking UI. It deliberately does not connect the UI to the current Core implementation yet.

## Adapter boundary

```text
TURNOS SaaS UI
    ↓
PublicBookingApi adapter
    ↓
/api/v1/public/*
    ↓
TURNOS Core
```

The UI depends on domain operations, not Express routes or database details.

## Domain operations

```ts
export interface PublicBookingApi {
  getContext(): Promise<PublicContext>;
  listServices(): Promise<PublicService[]>;
  getAvailability(input: AvailabilityQuery): Promise<AvailabilityResponse>;
  createBookingIntent(input: CreateBookingIntentInput): Promise<BookingIntentResponse>;
  confirmBooking(input: ConfirmBookingInput): Promise<BookingResponse>;
}
```

## UI states

Every asynchronous operation must expose:

- `LOADING`
- `SUCCESS`
- `EMPTY` where a collection has no results
- `ERROR`
- `RETRY`

The UI must never infer success from a `2xx` response alone when the payload represents a non-final business state.

## Tenant resolution

The SaaS client may provide a published business slug/domain to the public API adapter, but it must never submit an arbitrary internal organization ID as an authorization mechanism.

The Core is responsible for resolving and validating the organization context.

## Booking flow

```text
context
  → services
  → availability
  → booking-intent (temporary hold)
  → confirmation
```

The adapter must send an `Idempotency-Key` for write operations.

## Development mode

Until the Core endpoints are implemented and deployed, `/demo` may retain its isolated demo data. It must be impossible for demo fallback data to masquerade as a production booking.

Production builds must use the Core adapter when `TURNOS_CORE_API_URL` is configured and must fail explicitly if a production booking operation cannot reach the Core.

## Required environment variable

`TURNOS_CORE_API_URL`

No API secret is stored in this repository. Any server-side credential required later belongs in the deployment environment, never in client-side code.

## Acceptance criteria

- No UI component imports Express/Core internals.
- No admin endpoint is called from the browser.
- No arbitrary tenant ID is trusted by the client.
- Booking writes use idempotency.
- API errors are represented explicitly.
- Demo data is clearly separated from real Core data.
