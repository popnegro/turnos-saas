export type PublicService = {
  id: string;
  name: string;
  durationMinutes: number;
  price?: number;
};

export type AvailabilitySlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
};

export type BookingIntentInput = {
  tenantId: string;
  serviceId: string;
  startsAt: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
  };
  idempotencyKey: string;
};

export type BookingIntent = {
  id: string;
  expiresAt?: string;
};

export type BookingConfirmation = {
  id: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  startsAt: string;
  serviceId: string;
  customerName: string;
};

export type ApiError = {
  code: string;
  message: string;
  requestId?: string;
};

const CORE_URL = process.env.NEXT_PUBLIC_TURNOS_CORE_URL?.replace(/\/$/, '');

function coreUrl(path: string) {
  if (!CORE_URL) throw new Error('TURNOS Core URL is not configured.');
  return `${CORE_URL}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(coreUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error as ApiError | undefined;
    throw new Error(error?.message ?? `TURNOS Core returned HTTP ${response.status}.`);
  }

  return body as T;
}

export async function getPublicContext(tenantId: string) {
  return request<{ tenant: { id: string; name: string } }>(`/api/v1/public/context?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function getServices(tenantId: string) {
  return request<{ services: PublicService[] }>(`/api/v1/public/services?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function getAvailability(tenantId: string, serviceId: string, date: string) {
  return request<{ slots: AvailabilitySlot[] }>(
    `/api/v1/public/availability?tenantId=${encodeURIComponent(tenantId)}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`,
  );
}

export async function createBookingIntent(input: BookingIntentInput) {
  return request<BookingIntent>('/api/v1/public/booking-intents', {
    method: 'POST',
    headers: { 'Idempotency-Key': input.idempotencyKey },
    body: JSON.stringify(input),
  });
}

export async function confirmBooking(input: { tenantId: string; bookingIntentId: string; idempotencyKey: string }) {
  return request<BookingConfirmation>('/api/v1/public/bookings/confirm', {
    method: 'POST',
    headers: { 'Idempotency-Key': input.idempotencyKey },
    body: JSON.stringify(input),
  });
}

export function isCoreConfigured() {
  return Boolean(CORE_URL);
}
