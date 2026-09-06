# TURNOS SaaS — Demo validable en 5 días

## Objetivo

Convertir la demo interactiva actual en una experiencia preparada para consumir el TURNOS Core real, sin reescribir el producto comercial existente.

## Estado de este trabajo

- Commercial Site v1: existente en `main`.
- Demo interactiva v1: existente en `main`.
- Core API adapter: incorporado en esta rama.
- Persistencia y Core productivos: dependen de `popnegro/turnos`.
- Credenciales y URLs de infraestructura: no se incorporan al repositorio.

## Integración

Configurar `NEXT_PUBLIC_TURNOS_CORE_URL` con la URL del TURNOS Core. El adapter consume:

- `GET /api/v1/public/context`
- `GET /api/v1/public/services`
- `GET /api/v1/public/availability`
- `POST /api/v1/public/booking-intents`
- `POST /api/v1/public/bookings/confirm`

Las confirmaciones utilizan `Idempotency-Key`.

## Definition of Done de la Demo

1. El usuario selecciona servicio, fecha y horario.
2. La disponibilidad procede del Core.
3. La reserva se crea en el Core.
4. La confirmación devuelve un booking real.
5. El negocio puede visualizar la reserva.
6. El flujo funciona en móvil.
7. Typecheck, tests y build pasan.
8. El deploy se verifica mediante smoke test.

## Regla de alcance

No bloquear esta demo por Billing, Auth SaaS completo, CRM avanzado, Analytics avanzado, White Label, Multi-sede, Widget definitivo, Mercado Pago productivo o Google Calendar completo.

Tampoco se deben introducir credenciales en el código. Si falta una URL o secreto de infraestructura, debe tratarse como HUMAN GATE.
