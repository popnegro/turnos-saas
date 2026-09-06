'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, UserRound, AlertCircle } from 'lucide-react';
import { createBookingIntent, confirmBooking, getAvailability, getServices, isCoreConfigured, type PublicService, type AvailabilitySlot } from '../../lib/turnos-api';
import './demo.css';

const TENANT_ID = process.env.NEXT_PUBLIC_TURNOS_DEMO_TENANT_ID ?? 'demo';

function formatPrice(value?: number) {
  if (value == null) return 'Consultar';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}

function dateOptions() {
  const formatter = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return { value: date.toISOString().slice(0, 10), label: formatter.format(date).replace('.', '') };
  });
}

export default function DemoPage() {
  const dates = useMemo(dateOptions, []);
  const [services, setServices] = useState<PublicService[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(dates[0].value);
  const [slotId, setSlotId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState('');

  const service = useMemo(() => services.find((item) => item.id === serviceId), [services, serviceId]);
  const slot = useMemo(() => slots.find((item) => item.id === slotId), [slots, slotId]);
  const coreReady = isCoreConfigured();
  const canConfirm = coreReady && Boolean(service && slot && name.trim().length >= 2) && !submitting;

  useEffect(() => {
    if (!coreReady) {
      setLoadingServices(false);
      setError('La demo está lista para conectarse al TURNOS Core, pero falta configurar la URL del Core.');
      return;
    }

    let cancelled = false;
    setLoadingServices(true);
    getServices(TENANT_ID)
      .then((response) => {
        if (cancelled) return;
        setServices(response.services);
        setServiceId(response.services[0]?.id ?? '');
        setError('');
      })
      .catch((reason) => !cancelled && setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los servicios.'))
      .finally(() => !cancelled && setLoadingServices(false));

    return () => { cancelled = true; };
  }, [coreReady]);

  useEffect(() => {
    if (!coreReady || !serviceId || !date) return;
    let cancelled = false;
    setLoadingSlots(true);
    setSlotId('');
    getAvailability(TENANT_ID, serviceId, date)
      .then((response) => {
        if (cancelled) return;
        setSlots(response.slots.filter((item) => item.available));
        setError('');
      })
      .catch((reason) => !cancelled && setError(reason instanceof Error ? reason.message : 'No se pudo cargar la disponibilidad.'))
      .finally(() => !cancelled && setLoadingSlots(false));

    return () => { cancelled = true; };
  }, [coreReady, serviceId, date]);

  async function handleConfirm() {
    if (!canConfirm || !service || !slot) return;
    setSubmitting(true);
    setError('');
    const idempotencyKey = `demo-${crypto.randomUUID()}`;

    try {
      const intent = await createBookingIntent({
        tenantId: TENANT_ID,
        serviceId: service.id,
        startsAt: slot.startsAt,
        customer: { name: name.trim(), phone: phone.trim() || undefined },
        idempotencyKey,
      });
      const booking = await confirmBooking({
        tenantId: TENANT_ID,
        bookingIntentId: intent.id,
        idempotencyKey: `${idempotencyKey}-confirm`,
      });
      setBookingId(booking.id);
      setConfirmed(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo confirmar la reserva.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="demo-page">
      <header className="demo-nav">
        <a href="/" className="demo-brand"><span><CalendarDays size={17} /></span> TURNOS</a>
        <a href="/" className="demo-back"><ArrowLeft size={15} /> Volver al sitio</a>
      </header>

      <section className="demo-shell">
        <div className="demo-intro">
          <span className="demo-kicker">DEMO COMERCIAL</span>
          <h1>Reservá un turno en menos de un minuto.</h1>
          <p>Esta experiencia consume el TURNOS Core cuando está configurado: servicios, disponibilidad y confirmación de reserva pasan por la API real.</p>
          <div className="demo-trust"><Check size={15} /> Sin cuenta · Sin pago · Flujo preparado para clientes reales</div>
        </div>

        <div className="booking-card" aria-label="Demo de reserva">
          {error && (
            <div className="demo-error" role="alert"><AlertCircle size={17} /><span>{error}</span></div>
          )}

          {!confirmed ? (
            <>
              <div className="progress"><span className="active" /><span className="active" /><span className="active" /><span /></div>
              <div className="step-head"><div><small>PASO 1 DE 3</small><h2>Elegí tu servicio</h2></div><Clock3 size={20} /></div>
              {loadingServices ? <p>Cargando servicios…</p> : (
                <div className="service-list">
                  {services.map((item) => (
                    <button key={item.id} className={`choice ${serviceId === item.id ? 'selected' : ''}`} onClick={() => setServiceId(item.id)} type="button">
                      <span><b>{item.name}</b><small>{item.durationMinutes} min · {formatPrice(item.price)}</small></span>
                      {serviceId === item.id && <Check size={18} />}
                    </button>
                  ))}
                </div>
              )}

              <div className="step-head second"><div><small>PASO 2 DE 3</small><h2>Elegí día y horario</h2></div><CalendarDays size={20} /></div>
              <div className="days">
                {dates.map((item) => (
                  <button key={item.value} className={date === item.value ? 'selected' : ''} onClick={() => setDate(item.value)} type="button">
                    <span>{item.label.split(' ')[0]}</span><b>{item.label.split(' ')[1]}</b>
                  </button>
                ))}
              </div>
              <div className="slots">
                {loadingSlots ? <span>Cargando horarios…</span> : slots.length === 0 ? <span>No hay horarios disponibles para este día.</span> : slots.map((item) => (
                  <button key={item.id} className={slotId === item.id ? 'selected' : ''} onClick={() => setSlotId(item.id)} type="button">
                    {new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.startsAt))}
                  </button>
                ))}
              </div>

              <div className="step-head second"><div><small>PASO 3 DE 3</small><h2>Tus datos</h2></div><UserRound size={20} /></div>
              <div className="name-field"><label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. María González" autoComplete="name" /></label><label>WhatsApp <span>(opcional)</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Ej. 261 555 1234" autoComplete="tel" /></label></div>

              {service && slot && <div className="summary"><span><b>{service.name}</b><small>{date} · {new Date(slot.startsAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {service.durationMinutes} min</small></span><strong>{formatPrice(service.price)}</strong></div>}
              <button className="confirm" disabled={!canConfirm} onClick={handleConfirm} type="button">{submitting ? 'Confirmando…' : 'Confirmar reserva'} <ArrowRight size={16} /></button>
            </>
          ) : (
            <div className="success-state">
              <div className="success-icon"><Check size={28} /></div>
              <span className="demo-kicker">RESERVA CONFIRMADA</span>
              <h2>Turno confirmado.</h2>
              <p>La reserva fue enviada al TURNOS Core y confirmó correctamente.</p>
              <div className="summary success-summary"><span><b>{service?.name}</b><small>{name} · {date} · {slot ? new Date(slot.startsAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}</small></span><strong>{bookingId}</strong></div>
              <button className="confirm" onClick={() => { setConfirmed(false); setName(''); setPhone(''); setSlotId(''); }} type="button">Probar otra reserva <ArrowRight size={16} /></button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
