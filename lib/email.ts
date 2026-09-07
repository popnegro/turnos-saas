import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export type BookingConfirmationEmail = {
  to: string;
  customerName: string;
  tenantName: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function renderBookingEmail(input: BookingConfirmationEmail) {
  const date = new Intl.DateTimeFormat('es-AR', { dateStyle: 'full', timeZone: 'America/Argentina/Mendoza' }).format(new Date(input.startsAt));
  const start = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Mendoza' }).format(new Date(input.startsAt));
  const end = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Mendoza' }).format(new Date(input.endsAt));

  return `<!doctype html><html lang="es"><body style="margin:0;background:#f7f5f1;font-family:Arial,sans-serif;color:#24211d"><div style="max-width:560px;margin:40px auto;padding:32px;background:#fff;border:1px solid #e7e1d8"><p style="margin:0 0 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase">TURNOS</p><h1 style="margin:0 0 24px;font-size:28px">Turno confirmado</h1><p style="font-size:16px;line-height:1.6">Hola ${escapeHtml(input.customerName)}, tu turno en <strong>${escapeHtml(input.tenantName)}</strong> quedó confirmado.</p><div style="margin:24px 0;padding:20px;background:#f7f5f1"><p style="margin:0 0 8px"><strong>Servicio</strong><br>${escapeHtml(input.serviceName)}</p><p style="margin:0 0 8px"><strong>Día</strong><br>${escapeHtml(date)}</p><p style="margin:0"><strong>Horario</strong><br>${escapeHtml(start)} a ${escapeHtml(end)}</p></div><p style="font-size:13px;color:#6f6961;line-height:1.5">Este mensaje confirma la reserva realizada desde el sistema TURNOS.</p></div></body></html>`;
}

export async function sendBookingConfirmationEmail(input: BookingConfirmationEmail) {
  if (!resend || !process.env.TURNOS_EMAIL_FROM) return { sent: false, reason: 'EMAIL_NOT_CONFIGURED' as const };

  const { data, error } = await resend.emails.send({
    from: process.env.TURNOS_EMAIL_FROM,
    to: input.to,
    subject: `Turno confirmado — ${input.serviceName}`,
    html: renderBookingEmail(input),
  });

  if (error) return { sent: false, reason: 'EMAIL_SEND_FAILED' as const, error };
  return { sent: true, id: data?.id };
}
