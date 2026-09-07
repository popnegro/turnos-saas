'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import '../agenda.css';
import './disponibilidad.css';

type Rule = { weekday: number; startTime: string; endTime: string };

const TENANT_ID = process.env.NEXT_PUBLIC_TURNOS_DEMO_TENANT_ID ?? 'salud';
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DEFAULT_RULE = { startTime: '09:00', endTime: '17:00' };

export default function AvailabilityPage() {
  const [token, setToken] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function load(nextToken: string) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/v1/admin/availability?tenantId=${encodeURIComponent(TENANT_ID)}`, {
        headers: { Authorization: `Bearer ${nextToken}` }, cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? 'No se pudo cargar la disponibilidad.');
      setRules((body.availability ?? []).map((item: { weekday: number; start_time: string; end_time: string }) => ({ weekday: item.weekday, startTime: item.start_time, endTime: item.end_time })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar la disponibilidad.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('turnos-admin-token');
    if (!stored) { window.location.href = '/agenda'; return; }
    setToken(stored);
    void load(stored);
  }, []);

  function addRule(weekday: number) {
    setSaved(false);
    setRules((current) => [...current, { weekday, ...DEFAULT_RULE }]);
  }

  function updateRule(index: number, field: 'startTime' | 'endTime', value: string) {
    setSaved(false);
    setRules((current) => current.map((rule, itemIndex) => itemIndex === index ? { ...rule, [field]: value } : rule));
  }

  function removeRule(index: number) {
    setSaved(false);
    setRules((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function save() {
    setSaving(true); setSaved(false); setError('');
    try {
      const response = await fetch('/api/v1/admin/availability', {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: TENANT_ID, availability: rules }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? 'No se pudo guardar la disponibilidad.');
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la disponibilidad.');
    } finally { setSaving(false); }
  }

  return (
    <main className="agenda-page">
      <header className="agenda-header">
        <div><a href="/agenda" className="agenda-brand">TURNOS</a><span className="agenda-kicker">CONFIGURACIÓN DEL NEGOCIO</span></div>
        <a href="/agenda" className="availability-back"><ArrowLeft size={15} /> Agenda</a>
      </header>
      <section className="availability-shell">
        <div className="availability-title"><span className="agenda-kicker">HORARIOS DE ATENCIÓN</span><h1>Disponibilidad</h1><p>Definí cuándo puede recibir reservas tu negocio. Podés agregar hasta dos franjas por día.</p></div>
        {error && <div className="agenda-error" role="alert">{error}</div>}
        {loading ? <div className="availability-loading">Cargando disponibilidad…</div> : (
          <div className="availability-card">
            {DAYS.map((day, weekday) => {
              const dayRules = rules.map((rule, index) => ({ rule, index })).filter(({ rule }) => rule.weekday === weekday);
              return <div className="availability-day" key={day}>
                <div className="availability-day-name"><strong>{day}</strong><button type="button" onClick={() => addRule(weekday)} disabled={dayRules.length >= 2}><Plus size={15} /> Agregar horario</button></div>
                {dayRules.length === 0 ? <span className="availability-closed">Cerrado</span> : dayRules.map(({ rule, index }) => (
                  <div className="availability-rule" key={`${weekday}-${index}`}>
                    <input type="time" value={rule.startTime} onChange={(event) => updateRule(index, 'startTime', event.target.value)} aria-label={`${day} desde`} />
                    <span>→</span>
                    <input type="time" value={rule.endTime} onChange={(event) => updateRule(index, 'endTime', event.target.value)} aria-label={`${day} hasta`} />
                    <button className="availability-remove" type="button" onClick={() => removeRule(index)} aria-label={`Eliminar horario de ${day}`}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>;
            })}
            <div className="availability-actions"><span>{saved ? <><Check size={15} /> Guardado</> : 'Los cambios afectan las nuevas reservas.'}</span><button type="button" onClick={() => void save()} disabled={saving}>{saving ? 'Guardando…' : 'Guardar disponibilidad'}</button></div>
          </div>
        )}
      </section>
    </main>
  );
}
