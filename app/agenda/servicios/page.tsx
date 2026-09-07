'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Check, CirclePlus, Eye, EyeOff, Trash2 } from 'lucide-react';
import '../agenda.css';
import './servicios.css';

type Service = { id: string; name: string; durationMinutes: number; price: number | null; active: boolean };

const TENANT_ID = process.env.NEXT_PUBLIC_TURNOS_DEMO_TENANT_ID ?? 'salud';

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function money(value: number | null) {
  return value === null ? 'Sin precio' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}

export default function ServicesPage() {
  const [token, setToken] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function load(nextToken: string) {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/v1/admin/services?tenantId=${encodeURIComponent(TENANT_ID)}`, { headers: { Authorization: `Bearer ${nextToken}` }, cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? 'No se pudieron cargar los servicios.');
      setServices(body.services ?? []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los servicios.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('turnos-admin-token');
    if (!stored) { window.location.href = '/agenda'; return; }
    setToken(stored); void load(stored);
  }, []);

  function update(index: number, patch: Partial<Service>) {
    setSaved(false); setServices(current => current.map((service, itemIndex) => itemIndex === index ? { ...service, ...patch } : service));
  }

  function addService() {
    setSaved(false);
    const base = `nuevo-servicio-${Date.now().toString(36)}`;
    setServices(current => [...current, { id: base, name: 'Nuevo servicio', durationMinutes: 30, price: null, active: true }]);
  }

  function deactivate(index: number) { update(index, { active: false }); }
  function activate(index: number) { update(index, { active: true }); }

  async function save() {
    setSaving(true); setSaved(false); setError('');
    try {
      const normalized = services.map(service => ({ ...service, id: slugify(service.id) || slugify(service.name) }));
      const response = await fetch('/api/v1/admin/services', {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: TENANT_ID, services: normalized }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? 'No se pudieron guardar los servicios.');
      setServices(body.services ?? normalized); setSaved(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron guardar los servicios.'); }
    finally { setSaving(false); }
  }

  return (
    <main className="agenda-page">
      <header className="agenda-header">
        <div><a href="/agenda" className="agenda-brand">TURNOS</a><span className="agenda-kicker">CONFIGURACIÓN DEL NEGOCIO</span></div>
        <a href="/agenda" className="availability-back"><ArrowLeft size={15} /> Agenda</a>
      </header>
      <section className="services-shell">
        <div className="services-title"><div><span className="agenda-kicker">CATÁLOGO DE TURNOS</span><h1>Servicios</h1><p>Definí qué puede reservar tu cliente, cuánto dura cada servicio y su precio.</p></div><button className="services-add" type="button" onClick={addService}><CirclePlus size={16} /> Nuevo servicio</button></div>
        {error && <div className="agenda-error" role="alert">{error}</div>}
        {loading ? <div className="services-loading">Cargando servicios…</div> : (
          <div className="services-card">
            {services.map((service, index) => <article className={`service-row${service.active ? '' : ' is-inactive'}`} key={`${service.id}-${index}`}>
              <div className="service-fields">
                <label>Nombre<input value={service.name} maxLength={120} onChange={event => update(index, { name: event.target.value })} /></label>
                <label>Duración<select value={service.durationMinutes} onChange={event => update(index, { durationMinutes: Number(event.target.value) })}>{[15, 30, 45, 60, 90, 120, 180, 240].map(value => <option key={value} value={value}>{value} min</option>)}</select></label>
                <label>Precio<input type="number" min="0" step="100" placeholder="Sin precio" value={service.price ?? ''} onChange={event => update(index, { price: event.target.value === '' ? null : Number(event.target.value) })} /></label>
              </div>
              <div className="service-meta"><span>{service.active ? money(service.price) : 'No disponible para nuevas reservas'}</span><code>{service.id}</code></div>
              <div className="service-actions">{service.active ? <button type="button" onClick={() => deactivate(index)}><EyeOff size={15} /> Desactivar</button> : <button type="button" onClick={() => activate(index)}><Eye size={15} /> Activar</button>}<button type="button" className="service-delete" onClick={() => deactivate(index)} aria-label={`Desactivar ${service.name}`}><Trash2 size={15} /></button></div>
            </article>)}
            {services.length === 0 && <div className="services-empty"><h2>Sin servicios</h2><p>Agregá al menos un servicio para habilitar reservas.</p><button type="button" onClick={addService}>Crear servicio</button></div>}
            <div className="services-actions"><span>{saved ? <><Check size={15} /> Guardado</> : 'Los cambios afectan las nuevas reservas.'}</span><button type="button" onClick={() => void save()} disabled={saving || services.length === 0}>{saving ? 'Guardando…' : 'Guardar servicios'}</button></div>
          </div>
        )}
      </section>
    </main>
  );
}
