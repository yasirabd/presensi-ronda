import Link from 'next/link';

export function Introduction() {
  return <div className="intro">
    <div className="intro-copy">
      <h1>Malam ini, siapa yang ronda?</h1>
      <p>Lihat giliran jaga Anda di Ronda Pak. Saat tiba di pos, cek lokasi dan verifikasi wajah lewat HP untuk mencatat kehadiran.</p>
      <div className="intro-actions">
        <Link href="/daftar">Buat akun</Link>
        <Link href="/masuk">Sudah punya akun? Masuk</Link>
      </div>
    </div>
    <figure><img src="/sapa-pos-ronda.webp" width="1200" height="800" alt="Warga berkumpul di pos ronda bersama maskot burung hantu Ronda Pak."/></figure>
    <div className="intro-roles">
      <div><h2>Untuk warga</h2><p>Gabung lewat undangan pengurus. Setelah wajah terdaftar, Anda bisa absen saat giliran jaga dimulai.</p></div>
      <div><h2>Untuk pengurus RT</h2><p>Daftarkan RT, undang warga, lalu susun giliran. Rekap kehadiran bisa diunduh setiap bulan.</p></div>
    </div>
  </div>;
}
