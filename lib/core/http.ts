import { randomUUID } from 'node:crypto';
import { ensureSchema } from './db';

export class CoreError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

export function jsonError(error: unknown) {
  const requestId = randomUUID();
  if (error instanceof CoreError) {
    return Response.json({ error: { code: error.code, message: error.message, requestId } }, { status: error.status });
  }
  console.error({ requestId, error });
  return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno.', requestId } }, { status: 500 });
}

export async function ready() {
  await ensureSchema();
}

export function required(value: string | null | undefined, field: string) {
  const clean = value?.trim();
  if (!clean) throw new CoreError('VALIDATION_ERROR', `${field} es obligatorio.`);
  return clean;
}
