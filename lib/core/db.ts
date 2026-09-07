import { Pool, type PoolClient } from '@neondatabase/serverless';

const globalForTurnos = globalThis as typeof globalThis & { __turnosPool?: Pool };
let schemaPromise: Promise<void> | undefined;

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required by TURNOS Core.');
  globalForTurnos.__turnosPool ??= new Pool({ connectionString, max: 5 });
  return globalForTurnos.__turnosPool;
}

export async function db(): Promise<PoolClient> {
  return getPool().connect();
}

export async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = getPool().query(`
      CREATE TABLE IF NOT EXISTS turnos_tenants (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'America/Argentina/Mendoza', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS turnos_services (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES turnos_tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL, duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0), price NUMERIC,
        active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS turnos_availability_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL REFERENCES turnos_tenants(id) ON DELETE CASCADE,
        weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6), start_time TIME NOT NULL, end_time TIME NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK (start_time < end_time),
        UNIQUE (tenant_id, weekday, start_time, end_time)
      );
      CREATE TABLE IF NOT EXISTS turnos_booking_intents (
        id UUID PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES turnos_tenants(id) ON DELETE CASCADE,
        service_id TEXT NOT NULL REFERENCES turnos_services(id), starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
        customer_name TEXT NOT NULL, customer_phone TEXT, status TEXT NOT NULL DEFAULT 'pending', expires_at TIMESTAMPTZ NOT NULL,
        idempotency_key TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (tenant_id, idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS turnos_bookings (
        id UUID PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES turnos_tenants(id) ON DELETE CASCADE,
        service_id TEXT NOT NULL REFERENCES turnos_services(id), booking_intent_id UUID NOT NULL UNIQUE REFERENCES turnos_booking_intents(id),
        starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, customer_name TEXT NOT NULL, customer_phone TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (tenant_id, starts_at)
      );
      CREATE INDEX IF NOT EXISTS turnos_bookings_tenant_start_idx ON turnos_bookings(tenant_id, starts_at);
      CREATE INDEX IF NOT EXISTS turnos_intents_tenant_start_idx ON turnos_booking_intents(tenant_id, starts_at);
      CREATE INDEX IF NOT EXISTS turnos_availability_tenant_weekday_idx ON turnos_availability_rules(tenant_id, weekday);
      INSERT INTO turnos_tenants (id, name) VALUES ('demo', 'TURNOS Demo'), ('salud', 'Salud Demo') ON CONFLICT (id) DO NOTHING;
      INSERT INTO turnos_services (id, tenant_id, name, duration_minutes, price) VALUES
        ('salud-consulta', 'salud', 'Consulta general', 30, 25000), ('salud-control', 'salud', 'Control', 30, 18000),
        ('salud-primera', 'salud', 'Primera consulta', 60, 30000), ('demo-consulta', 'demo', 'Consulta', 30, NULL)
      ON CONFLICT (id) DO NOTHING;
      INSERT INTO turnos_availability_rules (tenant_id, weekday, start_time, end_time)
      SELECT 'salud', weekday, '09:00', '17:00'::time FROM generate_series(1, 5) AS weekday
      WHERE NOT EXISTS (SELECT 1 FROM turnos_availability_rules WHERE tenant_id = 'salud');
      INSERT INTO turnos_availability_rules (tenant_id, weekday, start_time, end_time)
      SELECT 'demo', weekday, '09:00', '17:00'::time FROM generate_series(1, 5) AS weekday
      WHERE NOT EXISTS (SELECT 1 FROM turnos_availability_rules WHERE tenant_id = 'demo');
    `).then(() => undefined);
  }
  return schemaPromise;
}
