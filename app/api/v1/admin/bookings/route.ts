import { db } from '../../../../../lib/core/db';
import { CoreError, jsonError, ready, required } from '../../../../../lib/core/http';

export const runtime = 'nodejs';

function authorize(request: Request) {
  const configured = process.env.TURNOS_ADMIN_TOKEN;
  if (!configured) throw new CoreError('ADMIN_NOT_CONFIGURED', 'La agenda administrativa no está configurada.', 503);
  const authorization = request.headers.get('Authorization');
  if (authorization !== `Bearer ${configured}`) throw new CoreError('UNAUTHORIZED', 'Token administrativo inválido.', 401);
}

export async function GET(request: Request) {
  try {
    authorize(request);
    await ready();
    const url = new URL(request.url);
    const tenantId = required(url.searchParams.get('tenantId'), 'tenantId');
    const date = required(url.searchParams.get('date'), 'date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new CoreError('VALIDATION_ERROR', 'date debe tener formato YYYY-MM-DD.');

    const client = await db();
    try {
      const result = await client.query(
        `SELECT b.id, b.service_id AS "serviceId", s.name AS "serviceName",
                b.starts_at AS "startsAt", b.ends_at AS "endsAt",
                b.customer_name AS "customerName", b.customer_phone AS "customerPhone",
                b.status
           FROM turnos_bookings b
           JOIN turnos_services s ON s.id = b.service_id
          WHERE b.tenant_id = $1
            AND b.starts_at >= ($2::date AT TIME ZONE 'America/Argentina/Mendoza')
            AND b.starts_at < (($2::date + INTERVAL '1 day') AT TIME ZONE 'America/Argentina/Mendoza')
          ORDER BY b.starts_at ASC`,
        [tenantId, date],
      );
      return Response.json({ bookings: result.rows }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    } finally {
      client.release();
    }
  } catch (error) {
    return jsonError(error);
  }
}
