import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  icons: { icon: (process.env.PAGES_BASE_PATH || '') + '/favicon.svg' },
  title: 'Flores amarillas · Tu constelación',
  description: 'Una galaxia 3D de flores amarillas, fotografías y cartas de amor.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#070913' };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <html lang="es"><body>{children}</body></html>;
}
