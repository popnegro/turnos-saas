import { randomUUID } from 'node:crypto';
import { db } from '../../../../../../lib/core/db';
import { CoreError, jsonError, ready, required } from '../../../../../../lib/core/http';
import { sendBookingConfirmationEmail } from '../../../../../../lib/email';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await ready();
    required(request.headers.get('Idempotency-Key'), 'Idempotency-Key');
    const body = await request.json();
    const tenantId = required(body.tenantId, 'tenantId');
    const bookingIntentId = required(body.bookingIntentId, 'bookingIntentId');
    const client = await db();
    try {
      await client.query('BEGIN');
      const intentResult = await client.query(
        'SELECT id, tenant_id, service_id, starts_at, ends_at, customer_name, customer_phone, customer_email, status, expires_at FROM turnos_booking_intents WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [bookingIntentId, tenantId],
      );
      const intent = intentResult.rows[0];
      if (!intent) throw new CoreError('BOOKING_INTENT_NOT_FOUND', 'La intención de reserva no existe.', 404);

      const existing = await client.query(
        'SELECT id, tenant_id AS "tenantId", service_id AS "serviceId", starts_at AS "startsAt", ends_at AS "endsAt", customer_name AS "customerName", customer_phone AS "customerPhone", customer_email AS "customerEmail", status FROM turnos_bookings WHERE booking_intent_id = $1',
        [bookingIntentId],
      );
      if (existing.rows[0]) {
        await client.query('COMMIT');
        return Response.json({ booking: existing.rows[0] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
      }
      if (intent.status !== 'pending') throw new CoreError('BOOKING_INTENT_INVALID', 'La reserva ya no puede confirmarse.', 409);
      if (new Date(intent.expires_at).getTime() < Date.now()) throw new CoreError('BOOKING_INTENT_EXPIRED', 'La reserva expiró. Elegí otro horario.', 409);

      let booking: Record<string, unknown>;
      let serviceName = intent.service_id;
      let tenantName = tenantId;
      try {
        const result = await client.query(
          'INSERT INTO turnos_bookings (id, tenant_id, service_id, booking_intent_id, starts_at, ends_at, customer_name, customer_phone, customer_email) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, tenant_id AS "tenantId", service_id AS "serviceId", starts_at AS "startsAt", ends_at AS "endsAt", customer_name AS "customerName", customer_phone AS "customerPhone", customer_email AS "customerEmail", status',
          [randomUUID(), tenantId, intent.service_id, intent.id, intent.starts_at, intent.ends_at, intent.customer_name, intent.customer_phone, intent.customer_email],
        );
        booking = result.rows[0];
        const names = await client.query(
          'SELECT t.name AS "tenantName", s.name AS "serviceName" FROM turnos_tenants t JOIN turnos_services s ON s.tenant_id = t.id WHERE t.id = $1 AND s.id = $2',
          [tenantId, intent.service_id],
        );
        if (names.rows[0]) {
          tenantName = names.rows[0].tenantName;
          serviceName = names.rows[0].serviceName;
        }
        await client.query('UPDATE turnos_booking_intents SET status = $1 WHERE id = $2', ['confirmed', intent.id]);
        await client.query('COMMIT');
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
          throw new CoreError('SLOT_UNAVAILABLE', 'El horario ya fue reservado por otra persona.', 409);
        }
        throw error;
      }

      if (typeof intent.customer_email === 'string' && intent.customer_email) {
        void sendBookingConfirmationEmail({
          to: intent.customer_email,
          customerName: intent.customer_name,
          tenantName,
          serviceName,
          startsAt: intent.starts_at,
          endsAt: intent.ends_at,
        }).catch(() => undefined);
      }

      return Response.json({ booking }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  } catch (error) { return jsonError(error); }
}
