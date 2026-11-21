import type { ReactNode } from 'react';
import Link from 'next/link';
import { GeistSans } from 'geist/font/sans';
import '@fontsource/nunito/latin-900.css';
import './styles.css';

export const metadata = { title: 'Ronda Pak · Presensi ronda RT' };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={GeistSans.variable}>
      <body>
        <header>
          <Link href="/" className="brand-link" aria-label="Beranda Ronda Pak">
            <img src="/ronda-pak-owl.png" width="40" height="40" alt="" />
            Ronda Pak
          </Link>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
