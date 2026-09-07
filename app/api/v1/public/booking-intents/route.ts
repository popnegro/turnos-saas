import { randomUUID } from 'node:crypto';
import { db } from '../../../../../lib/core/db';
import { CoreError, jsonError, ready, required } from '../../../../../lib/core/http';

export const runtime = 'nodejs';

function weekdayInMendoza(value: Date) {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Argentina/Mendoza' }).format(value);
  return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[day];
}

function minutesInMendoza(value: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Mendoza' }).formatToParts(value);
  return Number(parts.find((part) => part.type === 'hour')?.value) * 60 + Number(parts.find((part) => part.type === 'minute')?.value);
}

export async function POST(request: Request) {
  try {
    await ready();
    const idempotencyKey = required(request.headers.get('Idempotency-Key'), 'Idempotency-Key');
    const body = await request.json();
    const tenantId = required(body.tenantId, 'tenantId');
    const serviceId = required(body.serviceId, 'serviceId');
    const startsAt = required(body.startsAt, 'startsAt');
    const customerName = required(body.customer?.name, 'customer.name');
    const customerPhone = typeof body.customer?.phone === 'string' ? body.customer.phone.trim() : null;
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) throw new CoreError('VALIDATION_ERROR', 'startsAt no es una fecha válida.');

    const client = await db();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        'SELECT id, tenant_id AS "tenantId", service_id AS "serviceId", starts_at AS "startsAt", ends_at AS "endsAt", customer_name AS "customerName", customer_phone AS "customerPhone", status, expires_at AS "expiresAt" FROM turnos_booking_intents WHERE tenant_id = $1 AND idempotency_key = $2',
        [tenantId, idempotencyKey],
      );
      if (existing.rows[0]) {
        await client.query('COMMIT');
        return Response.json({ intent: existing.rows[0] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
      }

      const service = await client.query('SELECT duration_minutes FROM turnos_services WHERE id = $1 AND tenant_id = $2 AND active = true', [serviceId, tenantId]);
      if (!service.rows[0]) throw new CoreError('SERVICE_NOT_FOUND', 'El servicio no existe.', 404);
      const duration = Number(service.rows[0].duration_minutes);
      const endsAt = new Date(start.getTime() + duration * 60_000);
      const weekday = weekdayInMendoza(start);
      const startMinutes = minutesInMendoza(start);
      const endMinutes = minutesInMendoza(endsAt);
      const schedule = await client.query(
        `SELECT 1 FROM turnos_availability_rules
         WHERE tenant_id = $1 AND weekday = $2
           AND EXTRACT(HOUR FROM start_time) * 60 + EXTRACT(MINUTE FROM start_time) <= $3
           AND EXTRACT(HOUR FROM end_time) * 60 + EXTRACT(MINUTE FROM end_time) >= $4
         LIMIT 1`,
        [tenantId, weekday, startMinutes, endMinutes],
      );
      if (!schedule.rows[0]) throw new CoreError('SLOT_OUTSIDE_AVAILABILITY', 'El horario solicitado no está dentro de la disponibilidad del negocio.', 409);

      const conflict = await client.query(
        'SELECT 1 FROM turnos_bookings WHERE tenant_id = $1 AND status = $2 AND starts_at < $3 AND ends_at > $4 LIMIT 1',
        [tenantId, 'confirmed', endsAt.toISOString(), start.toISOString()],
      );
      if (conflict.rows[0]) throw new CoreError('SLOT_UNAVAILABLE', 'El horario ya no está disponible.', 409);

      const id = randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60_000);
      const result = await client.query(
        'INSERT INTO turnos_booking_intents (id, tenant_id, service_id, starts_at, ends_at, customer_name, customer_phone, expires_at, idempotency_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, tenant_id AS "tenantId", service_id AS "serviceId", starts_at AS "startsAt", ends_at AS "endsAt", customer_name AS "customerName", customer_phone AS "customerPhone", status, expires_at AS "expiresAt"',
        [id, tenantId, serviceId, start.toISOString(), endsAt.toISOString(), customerName, customerPhone, expiresAt.toISOString(), idempotencyKey],
      );
      await client.query('COMMIT');
      return Response.json({ intent: result.rows[0] }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  } catch (error) { return jsonError(error); }
}
