import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TURNOS — Tu agenda online. Tus clientes. Tus reservas.',
  description: 'Sistema de reservas online para pequeñas y medianas empresas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
