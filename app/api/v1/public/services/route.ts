import { db } from '../../../../../lib/core/db';
import { CoreError, jsonError, ready, required } from '../../../../../lib/core/http';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await ready();
    const tenantId = required(new URL(request.url).searchParams.get('tenantId'), 'tenantId');
    const client = await db();
    try {
      const result = await client.query(
        'SELECT id, name, duration_minutes AS "durationMinutes", price::float8 AS price FROM turnos_services WHERE tenant_id = $1 AND active = true ORDER BY created_at, id',
        [tenantId],
      );
      if (!result.rows.length) throw new CoreError('NO_SERVICES', 'No hay servicios disponibles.', 404);
      return Response.json({ services: result.rows }, { headers: { 'Cache-Control': 'no-store' } });
    } finally { client.release(); }
  } catch (error) { return jsonError(error); }
}
