'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Phone, RefreshCw, UserRound } from 'lucide-react';
import './agenda.css';

type Booking = {
  id: string;
  serviceId: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerPhone?: string | null;
  status: string;
};

const TENANT_ID = process.env.NEXT_PUBLIC_TURNOS_DEMO_TENANT_ID ?? 'salud';

function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Mendoza' });
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Mendoza' }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Mendoza' }).format(new Date(`${value}T12:00:00-03:00`));
}

export default function AgendaPage() {
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [date, setDate] = useState(localDate());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dateOptions = useMemo(() => Array.from({ length: 5 }, (_, index) => localDate(index)), []);

  async function loadAgenda(nextDate = date, nextToken = token) {
    if (!nextToken) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/v1/admin/bookings?tenantId=${encodeURIComponent(TENANT_ID)}&date=${encodeURIComponent(nextDate)}`, {
        headers: { Authorization: `Bearer ${nextToken}` },
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? 'No se pudo cargar la agenda.');
      setBookings(body.bookings ?? []);
      setAuthenticated(true);
    } catch (reason) {
      setAuthenticated(false);
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar la agenda.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('turnos-admin-token');
    if (stored) {
      setToken(stored);
      void loadAgenda(date, stored);
    }
    // Intentionally runs once to restore the local session token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sessionStorage.setItem('turnos-admin-token', token);
    void loadAgenda(date, token);
  }

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    if (authenticated) void loadAgenda(nextDate);
  }

  function logout() {
    sessionStorage.removeItem('turnos-admin-token');
    setToken('');
    setAuthenticated(false);
    setBookings([]);
  }

  if (!authenticated) {
    return (
      <main className="agenda-page agenda-login">
        <div className="agenda-login-card">
          <span className="agenda-kicker">TURNOS · NEGOCIO</span>
          <h1>Agenda</h1>
          <p>Ingresá el token administrativo para consultar las reservas del día.</p>
          {error && <div className="agenda-error" role="alert">{error}</div>}
          <form onSubmit={handleLogin}>
            <label>Token administrativo<input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="current-password" required /></label>
            <button type="submit">Abrir agenda</button>
          </form>
          <a href="/" className="agenda-back"><ArrowLeft size={15} /> Volver al sitio</a>
        </div>
      </main>
    );
  }

  return (
    <main className="agenda-page">
      <header className="agenda-header">
        <div><a href="/" className="agenda-brand">TURNOS</a><span className="agenda-kicker">AGENDA DEL NEGOCIO</span></div>
        <button className="agenda-logout" onClick={logout} type="button">Cerrar sesión</button>
      </header>
      <section className="agenda-shell">
        <div className="agenda-title-row"><div><h1>Agenda</h1><p>{formatDate(date)}</p></div><button className="refresh" onClick={() => void loadAgenda()} type="button" disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar</button></div>
        <div className="agenda-days">
          {dateOptions.map((option) => (
            <button key={option} className={date === option ? 'selected' : ''} onClick={() => handleDateChange(option)} type="button">
              {new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', timeZone: 'America/Argentina/Mendoza' }).format(new Date(`${option}T12:00:00-03:00`))}
            </button>
          ))}
        </div>
        {error && <div className="agenda-error" role="alert">{error}</div>}
        {loading ? <div className="agenda-empty">Cargando reservas…</div> : bookings.length === 0 ? (
          <div className="agenda-empty"><CalendarDays size={28} /><h2>Sin reservas</h2><p>No hay turnos confirmados para este día.</p></div>
        ) : (
          <div className="booking-list">
            {bookings.map((booking) => (
              <article className="booking-row" key={booking.id}>
                <div className="booking-time"><Clock3 size={17} /><strong>{formatTime(booking.startsAt)}</strong><small>{formatTime(booking.endsAt)}</small></div>
                <div className="booking-main"><h2>{booking.customerName}</h2><p>{booking.serviceName}</p>{booking.customerPhone && <a href={`tel:${booking.customerPhone}`}><Phone size={14} /> {booking.customerPhone}</a>}</div>
                <div className="booking-status"><UserRound size={15} /> Confirmado</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
