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
    <figure><img src="/ronda-bersama.webp" width="1200" height="900" alt="Tiga bapak lintas generasi berjaga di pos ronda di tepi gang perumahan."/></figure>
    <div className="intro-roles">
      <details><summary>Cara absen sebagai warga</summary><ol>
        <li>Buka undangan pengurus dan masuk dengan email yang diundang. Pilih <strong>Gabung RT</strong>.</li>
        <li>Setelah pengurus memeriksa identitas Anda, buka <strong>Pendaftaran wajah saya</strong> untuk mendaftar lewat kamera depan.</li>
        <li>Saat giliran dimulai, datang ke pos dan pilih <strong>Absen sekarang</strong>. Izinkan lokasi, buka kamera, lalu pilih <strong>Verifikasi kehadiran</strong>. Tunggu keterangan <strong>Hadir</strong>.</li>
      </ol></details>
      <details><summary>Cara menyiapkan RT</summary><ol>
        <li>Masuk dan pilih <strong>Daftarkan RT baru</strong>. Aktifkan akses pengurus dengan kode aplikasi autentikator, lalu pilih <strong>Buat ruang RT</strong>.</li>
        <li>Buka <strong>Undang warga</strong>, masukkan email warga, buat undangan, lalu bagikan tautannya. Setelah warga bergabung, buka <strong>Verifikasi identitas warga</strong>.</li>
        <li>Simpan koordinat dan radius di <strong>Atur lokasi pos</strong>. Di <strong>Jadwalkan giliran</strong>, pilih warga dan masukkan nama pos yang sama.</li>
        <li>Buka <strong>Rekap presensi</strong> untuk memeriksa kehadiran dan mengunduh CSV.</li>
      </ol></details>
    </div>
  </div>;
}
