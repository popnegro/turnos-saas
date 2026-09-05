'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, UserRound } from 'lucide-react';
import './demo.css';

const services = [
  { id: 'consulta', name: 'Consulta inicial', duration: '45 min', price: '$22.000' },
  { id: 'control', name: 'Control / seguimiento', duration: '30 min', price: '$18.500' },
  { id: 'evaluacion', name: 'Evaluación profesional', duration: '60 min', price: '$28.000' },
];

const days = [
  { label: 'Hoy', date: '14' },
  { label: 'Jue', date: '15' },
  { label: 'Vie', date: '16' },
  { label: 'Sáb', date: '17' },
];

const slots = ['09:30', '10:15', '11:00', '11:45', '12:30'];

export default function DemoPage() {
  const [serviceId, setServiceId] = useState('consulta');
  const [day, setDay] = useState('Hoy');
  const [slot, setSlot] = useState('11:00');
  const [name, setName] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const service = useMemo(() => services.find((item) => item.id === serviceId) ?? services[0], [serviceId]);
  const canConfirm = name.trim().length >= 2 && Boolean(day) && Boolean(slot);

  function confirmBooking() {
    if (!canConfirm) return;
    setConfirmed(true);
  }

  return (
    <main className="demo-page">
      <header className="demo-nav">
        <a href="/" className="demo-brand"><span><CalendarDays size={17} /></span> TURNOS</a>
        <a href="/" className="demo-back"><ArrowLeft size={15} /> Volver al sitio</a>
      </header>

      <section className="demo-shell">
        <div className="demo-intro">
          <span className="demo-kicker">DEMO INTERACTIVA</span>
          <h1>Reservá un turno en menos de un minuto.</h1>
          <p>Probá el recorrido que después conectaremos al TURNOS Core. Esta demo no guarda datos ni realiza reservas reales.</p>
          <div className="demo-trust"><Check size={15} /> Sin cuenta · Sin pago · Sin datos persistidos</div>
        </div>

        <div className="booking-card" aria-label="Demo de reserva">
          {!confirmed ? (
            <>
              <div className="progress"><span className="active" /><span className="active" /><span /><span /></div>
              <div className="step-head"><div><small>PASO 1 DE 3</small><h2>Elegí tu servicio</h2></div><Clock3 size={20} /></div>
              <div className="service-list">
                {services.map((item) => (
                  <button key={item.id} className={`choice ${serviceId === item.id ? 'selected' : ''}`} onClick={() => setServiceId(item.id)} type="button">
                    <span><b>{item.name}</b><small>{item.duration} · {item.price}</small></span>
                    {serviceId === item.id && <Check size={18} />}
                  </button>
                ))}
              </div>

              <div className="step-head second"><div><small>PASO 2 DE 3</small><h2>Elegí día y horario</h2></div><CalendarDays size={20} /></div>
              <div className="days">
                {days.map((item) => (
                  <button key={item.date} className={day === item.label ? 'selected' : ''} onClick={() => setDay(item.label)} type="button"><span>{item.label}</span><b>{item.date}</b></button>
                ))}
              </div>
              <div className="slots">
                {slots.map((item) => <button key={item} className={slot === item ? 'selected' : ''} onClick={() => setSlot(item)} type="button">{item}</button>)}
              </div>

              <div className="step-head second"><div><small>PASO 3 DE 3</small><h2>Tus datos</h2></div><UserRound size={20} /></div>
              <label className="name-field">Nombre<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. María González" autoComplete="name" /></label>

              <div className="summary"><span><b>{service.name}</b><small>{day} · {slot} · {service.duration}</small></span><strong>{service.price}</strong></div>
              <button className="confirm" disabled={!canConfirm} onClick={confirmBooking} type="button">Confirmar reserva <ArrowRight size={16} /></button>
            </>
          ) : (
            <div className="success-state">
              <div className="success-icon"><Check size={28} /></div>
              <span className="demo-kicker">DEMO COMPLETADA</span>
              <h2>Turno listo para confirmar.</h2>
              <p>En la integración real, este paso enviará la reserva al TURNOS Core y devolverá el estado de la operación.</p>
              <div className="summary success-summary"><span><b>{service.name}</b><small>{name} · {day} · {slot}</small></span><strong>{service.price}</strong></div>
              <button className="confirm" onClick={() => setConfirmed(false)} type="button">Probar otra reserva <ArrowRight size={16} /></button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
