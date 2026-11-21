import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import './styles.css';

export const metadata = { title: 'Ronda Pak · Presensi ronda RT' };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={GeistSans.variable}>
      <body>
        <header>Ronda Pak</header>
        <main>{children}</main>
      </body>
    </html>
  );
}
