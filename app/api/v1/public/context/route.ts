import { db } from '../../../../../lib/core/db';
import { CoreError, jsonError, ready, required } from '../../../../../lib/core/http';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await ready();
    const tenantId = required(new URL(request.url).searchParams.get('tenantId'), 'tenantId');
    const client = await db();
    try {
      const result = await client.query('SELECT id, name, timezone FROM turnos_tenants WHERE id = $1', [tenantId]);
      if (!result.rows[0]) throw new CoreError('TENANT_NOT_FOUND', 'El comercio no existe.', 404);
      return Response.json({ tenant: result.rows[0] }, { headers: { 'Cache-Control': 'no-store' } });
    } finally { client.release(); }
  } catch (error) { return jsonError(error); }
}
