import { db } from '../../../../../lib/core/db';
import { CoreError, jsonError, ready, required } from '../../../../../lib/core/http';

export const runtime = 'nodejs';

function weekdayInMendoza(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Argentina/Mendoza' })
    .format(new Date(`${date}T12:00:00-03:00`));
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

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
      const weekday = WEEKDAY_INDEX[weekdayInMendoza(date)];
      const rules = await client.query(
        'SELECT to_char(start_time, \'HH24:MI\') AS start_time, to_char(end_time, \'HH24:MI\') AS end_time FROM turnos_availability_rules WHERE tenant_id = $1 AND weekday = $2 ORDER BY start_time',
        [tenantId, weekday],
      );
      const dayStart = new Date(`${date}T03:00:00.000Z`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const bookings = await client.query(
        'SELECT starts_at, ends_at FROM turnos_bookings WHERE tenant_id = $1 AND status = $2 AND starts_at < $3 AND ends_at > $4',
        [tenantId, 'confirmed', dayEnd.toISOString(), dayStart.toISOString()],
      );
      const busy = bookings.rows.map((row) => [new Date(row.starts_at).getTime(), new Date(row.ends_at).getTime()] as const);
      const slots: Array<{ id: string; startsAt: string; endsAt: string; available: boolean }> = [];
      const midnightUtc = new Date(`${date}T00:00:00.000Z`);
      for (const rule of rules.rows) {
        const [startHour, startMinute] = rule.start_time.split(':').map(Number);
        const [endHour, endMinute] = rule.end_time.split(':').map(Number);
        const start = startHour * 60 + startMinute;
        const end = endHour * 60 + endMinute;
        for (let minutes = start; minutes + duration <= end; minutes += 30) {
          const startsAt = new Date(midnightUtc.getTime() + (minutes + 180) * 60 * 1000);
          const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);
          const available = !busy.some(([busyStart, busyEnd]) => startsAt.getTime() < busyEnd && endsAt.getTime() > busyStart);
          slots.push({ id: `${serviceId}-${date}-${String(minutes).padStart(4, '0')}`, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), available });
        }
      }
      return Response.json({ slots }, { headers: { 'Cache-Control': 'no-store' } });
    } finally { client.release(); }
  } catch (error) { return jsonError(error); }
}
