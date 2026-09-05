'use client';

import { useState } from 'react';
import { ArrowRight, BarChart3, CalendarDays, Check, ChevronDown, Clock3, HeartPulse, Menu, MessageSquare, Scissors, ShieldCheck, Sparkles, Users, X, PawPrint, BriefcaseBusiness } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/5492617500100?text=Hola%2C%20quiero%20conocer%20TURNOS%20SaaS.';

const verticals = [
  { icon: HeartPulse, title: 'Salud', text: 'Consultorios y profesionales que necesitan ordenar su agenda y reducir tareas administrativas.' },
  { icon: Sparkles, title: 'Estética', text: 'Centros de estética y bienestar con servicios, profesionales y horarios configurables.' },
  { icon: Scissors, title: 'Peluquería / Barbería', text: 'Una experiencia de reserva simple para que tus clientes elijan cuándo volver.' },
  { icon: PawPrint, title: 'Veterinaria', text: 'Organizá consultas y atención con una agenda pensada para el día a día.' },
  { icon: BriefcaseBusiness, title: 'Servicios profesionales', text: 'Abogados, coaches, consultores y equipos que trabajan por turnos.' },
];

const faqs = [
  ['¿TURNOS reemplaza mi agenda actual?', 'Está pensado para centralizar la reserva y la gestión de turnos en una experiencia digital. La conexión con tu backend/API queda preparada para una implementación posterior.'],
  ['¿Mis clientes necesitan instalar una app?', 'No. La propuesta está diseñada como una experiencia web responsive, accesible desde el celular.'],
  ['¿Puedo adaptar TURNOS a mi negocio?', 'Sí. La estructura contempla distintos tipos de servicios, profesionales, horarios y verticales. Los detalles finales dependen de la implementación del backend.'],
  ['¿Qué funcionalidades están disponibles hoy?', 'Esta versión comercial define y comunica el producto sin inventar integraciones. Las capacidades concretas deben conectarse al backend/API de TURNOS.'],
  ['¿Hay funcionalidades futuras?', 'Sí. La arquitectura visual separa claramente lo que es producto actual de futuras capacidades para evitar promesas que todavía no están implementadas.'],
];

function Button({ children, variant = 'primary', href = '#demo' }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; href?: string }) {
  return <a href={href} className={`btn ${variant}`}><span>{children}</span><ArrowRight size={16} aria-hidden="true" /></a>;
}

export default function Home() {
  const [menu, setMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return <main>
    <header className="nav-wrap">
      <nav className="nav container" aria-label="Navegación principal">
        <a href="#top" className="brand" aria-label="TURNOS, inicio"><span className="brand-mark"><CalendarDays size={18}/></span><span>TURNOS</span></a>
        <div className={`nav-links ${menu ? 'open' : ''}`}>
          <a href="#como-funciona" onClick={() => setMenu(false)}>Cómo funciona</a>
          <a href="#funcionalidades" onClick={() => setMenu(false)}>Funcionalidades</a>
          <a href="#negocios" onClick={() => setMenu(false)}>Para tu negocio</a>
          <a href="#planes" onClick={() => setMenu(false)}>Planes</a>
        </div>
        <div className="nav-actions"><a className="login" href="#demo">Ver demo</a><Button href="#cta">Solicitar demo</Button></div>
        <button className="menu-btn" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="main-navigation" aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}>{menu ? <X/> : <Menu/>}</button>
      </nav>
    </header>

    <section id="top" className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><span className="dot"/> Sistema de reservas para negocios que crecen</div>
          <h1>Tu agenda online.<br/><em>Tus clientes.</em><br/>Tus reservas.</h1>
          <p className="hero-lead">TURNOS conecta todo lo que pasa antes, durante y después de una reserva. Menos coordinación manual. Más tiempo para atender.</p>
          <div className="hero-actions"><Button href="#cta">Solicitar demo</Button><Button variant="secondary" href="#demo">Ver cómo funciona</Button></div>
          <div className="micro-proof"><ShieldCheck size={15}/> Sin tarjetas · Configuración simple · Pensado para PyMEs</div>
        </div>
        <div className="hero-visual">
          <div className="glow"/>
          <div className="app-window" aria-label="Vista previa de la agenda TURNOS">
            <div className="window-top"><div className="window-dots"><i/><i/><i/></div><span>turnos.app / agenda</span><span className="live">● En vivo</span></div>
            <div className="dashboard">
              <aside><div className="mini-brand"><span className="brand-mark"><CalendarDays size={13}/></span> TURNOS</div><div className="side-active">▦ <span>Agenda</span></div><div>◌ <span>Clientes</span></div><div>□ <span>Servicios</span></div><div>⌁ <span>Reportes</span></div><div>⚙ <span>Configuración</span></div></aside>
              <div className="dash-main"><div className="dash-head"><div><small>MIÉRCOLES 14</small><h3>Agenda del día</h3></div><button type="button">+ Nuevo turno</button></div><div className="stats"><div><small>Turnos hoy</small><strong>18</strong><span>+12% vs. ayer</span></div><div><small>Confirmados</small><strong>15</strong><span>83% del total</span></div><div><small>Clientes nuevos</small><strong>6</strong><span>Este mes</span></div></div><div className="agenda-card"><div className="agenda-title"><span>09:00 — 13:00</span><span>Hoy</span></div>{[['09:30','María González','Consulta inicial','confirmado'],['10:15','Sofía Ramírez','Control','confirmado'],['11:00','Lucas Fernández','Sesión','pendiente']].map((r,i)=><div className="turn" key={i}><time>{r[0]}</time><div className="avatar">{r[1][0]}</div><div className="turn-info"><b>{r[1]}</b><span>{r[2]}</span></div><span className={`pill ${r[3]}`}>{r[3]}</span><span>···</span></div>)}</div></div>
            </div>
          </div>
          <div className="float-card float-one"><div className="float-icon"><Users size={17}/></div><div><b>+24 nuevos clientes</b><span>este mes</span></div></div>
          <div className="float-card float-two"><div className="check"><Check size={16}/></div><div><b>Turno confirmado</b><span>hoy · 10:15</span></div></div>
        </div>
      </div>
    </section>

    <section className="logos" aria-label="Beneficios"><div className="container logo-row"><span>Hecho para equipos que trabajan con agenda</span><i/><span>Simple para tus clientes</span><i/><span>Potente para tu negocio</span></div></section>

    <section id="como-funciona" className="section process"><div className="container"><div className="section-head"><div><span className="kicker">EL SISTEMA COMPLETO</span><h2>De la primera visita a la próxima reserva.</h2></div><p>Una experiencia pensada alrededor de cómo realmente crecen los negocios de servicios.</p></div><div className="flow"><div className="flow-line"/>{[['01','Adquisición','Hacé que te encuentren','Tu cliente llega a tu página de reservas.'],['02','Reserva','Elegí día y horario','Reserva en pocos pasos, desde cualquier dispositivo.'],['03','Agenda','Todo en un lugar','Tu equipo ve y gestiona la agenda sin cruces.'],['04','Cliente','Conocé a quien vuelve','Construí una base de clientes útil para tu negocio.'],['05','Repetición','Volvé a llenar la agenda','Convertí una buena atención en una próxima reserva.']].map(([n,t,s,d])=><div className="flow-item" key={n}><span className="num">{n}</span><div><h3>{t}</h3><b>{s}</b><p>{d}</p></div></div>)}</div></div></section>

    <section id="funcionalidades" className="section feature-section"><div className="container"><div className="section-head centered"><span className="kicker">FUNCIONALIDADES</span><h2>Todo lo que necesitás para dejar de perseguir turnos.</h2><p>La versión comercial comunica capacidades del producto sin asumir integraciones que todavía no están implementadas.</p></div><div className="feature-grid">{[
      [CalendarDays,'Reservas online','Una experiencia clara para que tus clientes puedan elegir servicio, día y horario.'],[Clock3,'Agenda centralizada','Visualizá la disponibilidad y organizá el trabajo de tu equipo desde un solo lugar.'],[Users,'Gestión de clientes','Centralizá la información que tu negocio necesita para reconocer y atender mejor.'],[BarChart3,'Visión del negocio','Prepará la base para entender ocupación, demanda y evolución de tus reservas.'],[MessageSquare,'Comunicación','Dejá preparada la experiencia para recordatorios y comunicación vinculada a las reservas.'],[ShieldCheck,'Pensado para PyMEs','Una experiencia profesional sin la complejidad de herramientas empresariales.']
    ].map(([Icon,title,text],i)=><div className="feature" key={i}><div className="feature-icon"><Icon size={21}/></div><h3>{title as string}</h3><p>{text as string}</p><span className="status">Base del producto</span></div>)}</div><div className="future-note"><Sparkles size={18}/><div><b>Lo que viene, claramente separado.</b><span>Integraciones, automatizaciones avanzadas y otras capacidades pueden incorporarse cuando estén conectadas al backend/API.</span></div></div></div></section>

    <section id="negocios" className="section verticals"><div className="container"><div className="section-head"><div><span className="kicker">PARA TU NEGOCIO</span><h2>Una base. Distintos negocios.</h2></div><p>TURNOS se adapta al flujo de servicios donde el tiempo y la agenda importan.</p></div><div className="vertical-grid">{verticals.map(({icon:Icon,title,text})=><div className="vertical-card" key={title}><Icon size={25}/><h3>{title}</h3><p>{text}</p><a href="#cta">Solicitar demo <ArrowRight size={15}/></a></div>)}</div></div></section>

    <section id="demo" className="section demo"><div className="container demo-grid"><div><span className="kicker">DEMO</span><h2>Tu cliente reserva. Vos ves qué pasa.</h2><p>Una vista de producto que hace tangible la propuesta: disponibilidad, reservas y clientes en una experiencia simple.</p><div className="demo-list"><span><Check/> Reserva sin llamadas</span><span><Check/> Agenda siempre actualizada</span><span><Check/> Datos listos para crecer</span></div><Button href="#cta">Solicitar demo</Button></div><div className="phone-wrap"><div className="phone"><div className="notch"/><div className="phone-top"><span>9:41</span><span>● ● ●</span></div><div className="phone-content"><small>RESERVÁ TU TURNO</small><h3>Elegí un servicio</h3><div className="service-selected"><div className="service-icon">✦</div><div><b>Consulta</b><span>45 minutos</span></div><Check size={17}/></div><h4>Elegí un horario</h4><div className="days"><b>Hoy<br/><span>14</span></b><span>Jue<br/><span>15</span></span><span>Vie<br/><span>16</span></span><span>Sáb<br/><span>17</span></span></div><div className="slots"><span>09:30</span><span>10:15</span><b>11:00</b><span>11:45</span></div><button type="button">Confirmar reserva <ArrowRight size={14}/></button></div></div></div></div></section>

    <section id="planes" className="section pricing"><div className="container"><div className="section-head centered"><span className="kicker">PLANES</span><h2>Empezá simple. Crecé cuando lo necesites.</h2><p>Planes conceptuales para la propuesta comercial. Los precios y límites se conectan a la definición final del backend.</p></div><div className="price-grid"><Price name="Starter" desc="Para empezar a ordenar tus reservas." features={['Agenda online','Reservas de clientes','Gestión básica de clientes','Experiencia responsive']} /><Price featured name="Pro" desc="Para negocios que quieren crecer." features={['Todo lo de Starter','Agenda por profesionales','Base de clientes ampliada','Visión del negocio','Soporte prioritario']} /><Price name="Business" desc="Para equipos y operaciones más grandes." features={['Todo lo de Pro','Capacidades avanzadas','Configuración a medida','Preparado para integraciones','Acompañamiento comercial']} /></div></div></section>

    <section id="faq" className="section faq"><div className="container faq-grid"><div><span className="kicker">PREGUNTAS FRECUENTES</span><h2>Lo importante, antes de empezar.</h2><p>Sin letra chica sobre capacidades que todavía no existen.</p></div><div>{faqs.map(([q,a],i)=><div className={`faq-item ${openFaq===i?'active':''}`} key={q}><button onClick={()=>setOpenFaq(openFaq===i?null:i)} aria-expanded={openFaq===i}><span>{q}</span><ChevronDown size={18}/></button>{openFaq===i && <p>{a}</p>}</div>)}</div></div></section>

    <section id="cta" className="final-cta"><div className="container"><div className="cta-card"><div className="cta-orb orb-a"/><div className="cta-orb orb-b"/><span className="kicker light">EMPEZÁ HOY</span><h2>Tu agenda puede trabajar<br/>mientras vos trabajás.</h2><p>Convertí reservas en clientes y clientes en recurrencia con una experiencia hecha para tu negocio.</p><div className="hero-actions"><a className="btn" href={WHATSAPP_URL} target="_blank" rel="noreferrer"><span>Hablar por WhatsApp</span><MessageSquare size={16} aria-hidden="true" /></a><a className="cta-link" href="#funcionalidades">Ver funcionalidades <ArrowRight size={16}/></a></div></div></div></section>

    <footer><div className="container footer"><a href="#top" className="brand"><span className="brand-mark"><CalendarDays size={16}/></span><span>TURNOS</span></a><span>Tu agenda online. Tus clientes. Tus reservas.</span><div><a href="#planes">Planes</a><a href="#faq">FAQ</a><a href="#cta">Contacto</a></div><small>© 2026 TURNOS. Producto SaaS.</small></div></footer>
  </main>
}

function Price({name,desc,features,featured=false}:{name:string,desc:string,features:string[],featured?:boolean}) { return <div className={`price-card ${featured?'featured':''}`}>{featured&&<span className="popular">Más elegido</span>}<h3>{name}</h3><p>{desc}</p><div className="price">Consultar<span> según configuración</span></div><Button href="#cta">Consultar plan</Button><div className="divider"/>{features.map(f=><div className="price-feature" key={f}><Check size={15}/>{f}</div>)}</div> }
