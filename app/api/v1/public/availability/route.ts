import { db } from '../../../../../lib/core/db';
import { CoreError, jsonError, ready, required } from '../../../../../lib/core/http';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await ready();
    const params = new URL(request.url).searchParams;
    const tenantId = required(params.get('tenantId'), 'tenantId');
    const serviceId = required(params.get('serviceId'), 'serviceId');
    const date = required(params.get('date'), 'date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new CoreError('VALIDATION_ERROR', 'date debe tener formato YYYY-MM-DD.');

    const client = await db();
    try {
      const service = await client.query('SELECT duration_minutes FROM turnos_services WHERE id = $1 AND tenant_id = $2 AND active = true', [serviceId, tenantId]);
      if (!service.rows[0]) throw new CoreError('SERVICE_NOT_FOUND', 'El servicio no existe.', 404);
      const duration = Number(service.rows[0].duration_minutes);
      const dayStart = new Date(`${date}T03:00:00.000Z`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const bookings = await client.query(
        'SELECT starts_at, ends_at FROM turnos_bookings WHERE tenant_id = $1 AND status = $2 AND starts_at < $3 AND ends_at > $4',
        [tenantId, 'confirmed', dayEnd.toISOString(), dayStart.toISOString()],
      );
      const busy = bookings.rows.map((row) => [new Date(row.starts_at).getTime(), new Date(row.ends_at).getTime()] as const);
      const slots: Array<{ id: string; startsAt: string; endsAt: string; available: boolean }> = [];
      const midnightUtc = new Date(`${date}T00:00:00.000Z`);
      for (let minutes = 9 * 60; minutes + duration <= 17 * 60; minutes += 30) {
        const startsAt = new Date(midnightUtc.getTime() + (minutes + 180) * 60 * 1000);
        const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);
        const available = !busy.some(([busyStart, busyEnd]) => startsAt.getTime() < busyEnd && endsAt.getTime() > busyStart);
        slots.push({ id: `${serviceId}-${date}-${String(minutes).padStart(4, '0')}`, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), available });
      }
      return Response.json({ slots }, { headers: { 'Cache-Control': 'no-store' } });
    } finally { client.release(); }
  } catch (error) { return jsonError(error); }
}
