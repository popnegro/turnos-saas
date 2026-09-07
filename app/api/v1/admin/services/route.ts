import { db } from '../../../../../lib/core/db';
import { CoreError, jsonError, ready, required } from '../../../../../lib/core/http';

export const runtime = 'nodejs';

function authorize(request: Request) {
  const configured = process.env.TURNOS_ADMIN_TOKEN;
  if (!configured) throw new CoreError('ADMIN_NOT_CONFIGURED', 'La agenda administrativa no está configurada.', 503);
  if (request.headers.get('Authorization') !== `Bearer ${configured}`) {
    throw new CoreError('UNAUTHORIZED', 'Token administrativo inválido.', 401);
  }
}

function validateServices(value: unknown) {
  if (!Array.isArray(value)) throw new CoreError('VALIDATION_ERROR', 'services debe ser un array.');
  if (value.length === 0) throw new CoreError('VALIDATION_ERROR', 'Debe existir al menos un servicio.');
  if (value.length > 50) throw new CoreError('VALIDATION_ERROR', 'Se permiten hasta 50 servicios.');

  return value.map((service: unknown) => {
    const item = service as { id?: unknown; name?: unknown; durationMinutes?: unknown; price?: unknown; active?: unknown };
    const id = String(item.id ?? '').trim();
    const name = String(item.name ?? '').trim();
    const durationMinutes = Number(item.durationMinutes);
    const price = item.price === null || item.price === '' || item.price === undefined ? null : Number(item.price);
    const active = item.active !== false;

    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(id) || !name || name.length > 120) {
      throw new CoreError('VALIDATION_ERROR', 'Cada servicio debe tener un identificador y nombre válidos.');
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
      throw new CoreError('VALIDATION_ERROR', 'La duración debe estar entre 5 y 480 minutos.');
    }
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 999999999)) {
      throw new CoreError('VALIDATION_ERROR', 'El precio debe ser un número mayor o igual a cero.');
    }
    return { id, name, durationMinutes, price, active };
  });
}

export async function GET(request: Request) {
  try {
    await ready();
    authorize(request);
    const tenantId = required(new URL(request.url).searchParams.get('tenantId'), 'tenantId');
    const client = await db();
    try {
      const result = await client.query(
        'SELECT id, name, duration_minutes AS "durationMinutes", price::float8 AS price, active FROM turnos_services WHERE tenant_id = $1 ORDER BY active DESC, created_at, id',
        [tenantId],
      );
      return Response.json({ services: result.rows });
    } finally { client.release(); }
  } catch (error) { return jsonError(error); }
}

export async function PUT(request: Request) {
  try {
    await ready();
    authorize(request);
    const body = await request.json().catch(() => null);
    const tenantId = required(body?.tenantId, 'tenantId');
    const services = validateServices(body?.services);
    const ids = new Set<string>();
    for (const service of services) {
      if (ids.has(service.id)) throw new CoreError('VALIDATION_ERROR', 'No se permiten servicios duplicados.');
      ids.add(service.id);
    }

    const client = await db();
    try {
      await client.query('BEGIN');
      const tenant = await client.query('SELECT id FROM turnos_tenants WHERE id = $1', [tenantId]);
      if (!tenant.rows[0]) throw new CoreError('TENANT_NOT_FOUND', 'El negocio no existe.', 404);

      for (const service of services) {
        const existing = await client.query('SELECT tenant_id FROM turnos_services WHERE id = $1', [service.id]);
        if (existing.rows[0] && existing.rows[0].tenant_id !== tenantId) {
          throw new CoreError('SERVICE_ID_CONFLICT', 'El identificador del servicio ya pertenece a otro negocio.', 409);
        }
        await client.query(
          `INSERT INTO turnos_services (id, tenant_id, name, duration_minutes, price, active)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, duration_minutes = EXCLUDED.duration_minutes, price = EXCLUDED.price, active = EXCLUDED.active`,
          [service.id, tenantId, service.name, service.durationMinutes, service.price, service.active],
        );
      }

      await client.query(
        `UPDATE turnos_services SET active = false
         WHERE tenant_id = $1 AND id <> ALL($2::text[])`,
        [tenantId, Array.from(ids)],
      );
      await client.query('COMMIT');
      return Response.json({ services });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  } catch (error) { return jsonError(error); }
}
