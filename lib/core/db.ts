import { Pool, type PoolClient } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required by TURNOS Core.');
}

const globalForTurnos = globalThis as typeof globalThis & { __turnosPool?: Pool };
const pool = globalForTurnos.__turnosPool ?? new Pool({ connectionString, max: 5 });
globalForTurnos.__turnosPool = pool;

let schemaPromise: Promise<void> | undefined;

export async function db(): Promise<PoolClient> {
  return pool.connect();
}

export async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS turnos_tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'America/Argentina/Mendoza',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS turnos_services (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES turnos_tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
        price NUMERIC,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS turnos_booking_intents (
        id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES turnos_tenants(id) ON DELETE CASCADE,
        service_id TEXT NOT NULL REFERENCES turnos_services(id),
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        expires_at TIMESTAMPTZ NOT NULL,
        idempotency_key TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS turnos_bookings (
        id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES turnos_tenants(id) ON DELETE CASCADE,
        service_id TEXT NOT NULL REFERENCES turnos_services(id),
        booking_intent_id UUID NOT NULL UNIQUE REFERENCES turnos_booking_intents(id),
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, starts_at)
      );
      CREATE INDEX IF NOT EXISTS turnos_bookings_tenant_start_idx ON turnos_bookings(tenant_id, starts_at);
      CREATE INDEX IF NOT EXISTS turnos_intents_tenant_start_idx ON turnos_booking_intents(tenant_id, starts_at);
      INSERT INTO turnos_tenants (id, name) VALUES ('demo', 'TURNOS Demo') ON CONFLICT (id) DO NOTHING;
      INSERT INTO turnos_tenants (id, name) VALUES ('salud', 'Salud Demo') ON CONFLICT (id) DO NOTHING;
      INSERT INTO turnos_services (id, tenant_id, name, duration_minutes, price) VALUES
        ('salud-consulta', 'salud', 'Consulta general', 30, 25000),
        ('salud-control', 'salud', 'Control', 30, 18000),
        ('salud-primera', 'salud', 'Primera consulta', 60, 30000),
        ('demo-consulta', 'demo', 'Consulta', 30, NULL)
      ON CONFLICT (id) DO NOTHING;
    `).then(() => undefined);
  }
  return schemaPromise;
}
