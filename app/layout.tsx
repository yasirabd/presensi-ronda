import type { ReactNode } from 'react';
import './styles.css';
export const metadata = { title: 'RondaHadir · Presensi ronda RT' };
export default function Layout({children}:{children:ReactNode}) {
  return <html lang="id"><body><header><img src="/rondahadir.webp" width="174" height="50" alt="RondaHadir"/></header><main>{children}</main></body></html>;
}
