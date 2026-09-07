import { db } from '../../../../../lib/core/db';
import { CoreError, jsonError, ready, required } from '../../../../../lib/core/http';

export const runtime = 'nodejs';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function authorize(request: Request) {
  const configured = process.env.TURNOS_ADMIN_TOKEN;
  if (!configured) throw new CoreError('ADMIN_NOT_CONFIGURED', 'La agenda administrativa no está configurada.', 503);
  const authorization = request.headers.get('Authorization');
  if (authorization !== `Bearer ${configured}`) throw new CoreError('UNAUTHORIZED', 'Token administrativo inválido.', 401);
}

export async function GET(request: Request) {
  try {
    await ready();
    authorize(request);
    const tenantId = required(new URL(request.url).searchParams.get('tenantId'), 'tenantId');
    const client = await db();
    try {
      const result = await client.query(
        'SELECT weekday, to_char(start_time, \'HH24:MI\') AS start_time, to_char(end_time, \'HH24:MI\') AS end_time FROM turnos_availability_rules WHERE tenant_id = $1 ORDER BY weekday, start_time',
        [tenantId],
      );
      return Response.json({ availability: result.rows });
    } finally { client.release(); }
  } catch (error) { return jsonError(error); }
}

export async function PUT(request: Request) {
  try {
    await ready();
    authorize(request);
    const body = await request.json().catch(() => null);
    const tenantId = required(body?.tenantId, 'tenantId');
    if (!Array.isArray(body?.availability)) throw new CoreError('VALIDATION_ERROR', 'availability debe ser un array.');
    if (body.availability.length > 14) throw new CoreError('VALIDATION_ERROR', 'Se permiten hasta 14 franjas semanales.');

    const rules = body.availability.map((rule: unknown) => {
      const item = rule as { weekday?: unknown; startTime?: unknown; endTime?: unknown };
      const weekday = Number(item.weekday);
      const startTime = String(item.startTime ?? '');
      const endTime = String(item.endTime ?? '');
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !TIME_RE.test(startTime) || !TIME_RE.test(endTime) || startTime >= endTime) {
        throw new CoreError('VALIDATION_ERROR', 'Cada franja debe tener día y horarios válidos.');
      }
      return { weekday, startTime, endTime };
    });

    const unique = new Set(rules.map((rule: { weekday: number; startTime: string; endTime: string }) => `${rule.weekday}|${rule.startTime}|${rule.endTime}`));
    if (unique.size !== rules.length) throw new CoreError('VALIDATION_ERROR', 'No se permiten franjas duplicadas.');

    const client = await db();
    try {
      await client.query('BEGIN');
      const tenant = await client.query('SELECT id FROM turnos_tenants WHERE id = $1', [tenantId]);
      if (!tenant.rows[0]) throw new CoreError('TENANT_NOT_FOUND', 'El negocio no existe.', 404);
      await client.query('DELETE FROM turnos_availability_rules WHERE tenant_id = $1', [tenantId]);
      for (const rule of rules) {
        await client.query(
          'INSERT INTO turnos_availability_rules (tenant_id, weekday, start_time, end_time) VALUES ($1, $2, $3, $4)',
          [tenantId, rule.weekday, rule.startTime, rule.endTime],
        );
      }
      await client.query('COMMIT');
      return Response.json({ availability: rules });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  } catch (error) { return jsonError(error); }
}
