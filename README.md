# Ronda Pak

Aplikasi SaaS presensi ronda RT menggunakan Next.js, TypeScript, Supabase Auth dan Postgres.

## Menjalankan lokal

Gunakan Node 22 atau 24. Jalankan `npm ci`, salin `.env.example` ke `.env.local`, lalu isi URL dan publishable key proyek Supabase. Terapkan semua file SQL di `supabase/migrations` sesuai urutan nama ke database Supabase baru. Aktifkan login email dengan magic link dan MFA TOTP. Izinkan redirect ke URL aplikasi lokal di pengaturan Auth. Jalankan `npm run dev` dan buka http://localhost:3000.

Pemilik masuk lewat email, menyiapkan autentikator, membuat RT, dan membagikan undangan kepada alamat email warga. Setelah warga menerima undangan, pemilik dapat menetapkan pos dan waktu giliran. Warga melihat jadwal sendiri. Formulir waktu giliran memakai zona waktu perangkat pengurus. Daftar jadwal warga memakai zona waktu RT.

Periksa build dengan `npm run build` dan tipe dengan `npm run typecheck`. Sebelum pilot, uji login email, MFA, dan isolasi dua RT dengan akun terpisah. Pemilik dengan 2FA dapat mencatat presensi manual per giliran, mengoreksi dengan alasan, dan mengunduh CSV per bulan serta warga. Pengurus mengatur koordinat serta radius melalui Atur lokasi pos menggunakan nama pos sesuai jadwal. Warga memeriksa lokasi pada giliran aktif melalui HTTPS atau localhost. Pengurus mengizinkan pendaftaran wajah setelah memeriksa identitas anggota. Warga menyetujui penggunaan templat per RT, mendaftarkan wajah, lalu bisa absen dengan lokasi dan kamera. Dasbor juga menyediakan kontak privasi, permintaan warga, dan pencabutan persetujuan.

## Layanan wajah

Server Next.js menjalankan Python/OpenCV di CPU. Dari root proyek jalankan `sh face/setup.sh` dengan Python 3.11, modul venv, dan curl. Skrip memverifikasi checksum model. Pada server, isi `FACE_SIGNING_KEY` dengan nilai heksadesimal dari `select encode(secret,'hex') from ronda_private.face_secret where id` melalui koneksi admin. Buat `FACE_TEMPLATE_KEY` dengan 32 byte acak dalam heksadesimal dan simpan stabil di secret manager. Kedua kunci hanya untuk server. Workspace pengembangan ini sudah dikonfigurasi.

Deteksi menggunakan YuNet, pencocokan menggunakan SFace, dan pemeriksaan wajah hidup pasif menggunakan anti-spoof-mn3. Kamera mengirim satu JPEG melalui HTTPS. Server memprosesnya di memori, menyimpan templat dengan AES-256-GCM, dan mencatat kehadiran setelah database memeriksa tanda tangan server, versi pendaftaran serta sesi lokasi. Ambang awal untuk eksperimen adalah 0,95 untuk skor wajah hidup dan 0,5 untuk kemiripan kosinus. Uji foto, video, unggahan ulang gambar digital, HP lama, kacamata, dan pencahayaan pos. Tetapkan kesiapan biometrik dengan pengukuran yang disyaratkan PRD. Presensi manual tersedia selama validasi.

Untuk hosting, Dockerfile menyertakan Python dan bobot model. Berikan kedua variabel publik Supabase sebagai build arguments serta kedua kunci rahasia saat runtime. Jalankan di belakang HTTPS dan batasi laju permintaan pada endpoint kamera. Model OpenCV dan anti-spoof diperoleh dari [OpenCV Zoo](https://github.com/opencv/opencv_zoo) dan [Open Model Zoo](https://github.com/openvinotoolkit/open_model_zoo/tree/master/models/public/anti-spoof-mn3).

## Verifikasi dan operasional

Jalankan `npm test` untuk regresi migrasi Postgres lokal, `npm run typecheck`, dan `npm run build`. Pengujian lokal menggunakan identitas dan templat sintetis. Penjadwalan pg_cron diverifikasi di Supabase. Job harian menghapus giliran berusia lebih dari 12 bulan beserta catatan kehadirannya serta membersihkan bukti lokasi dan undangan kedaluwarsa.

Sebelum melibatkan warga, pengurus perlu mengisi kontak privasi RT, menuntaskan penilaian dampak bersama pengelola platform, mengukur akurasi dengan relawan yang menyetujui uji, memilih backup terenkripsi dengan retensi maksimal 30 hari, menguji pemulihan serta penghapusan ulang, dan menyimulasikan notifikasi insiden. Saat menarik persetujuan, warga langsung kehilangan templat aktif. Setelah pemulihan, terapkan kembali permintaan penghapusan yang diterima sejak snapshot sebelum membuka akses. Sasaran pilot empat minggu dan ukuran keberhasilan ada di [PRD](prd/README.md).

## Pemeriksaan sebelum pilot empat minggu

| Pemeriksaan | Bukti yang perlu dicatat |
| --- | --- |
| Akun dan akses | Masuk melalui email di Android dan iPhone, uji pemilik dengan 2FA dan warga pada dua RT, pindahkan peran kemudian pastikan akses lama berakhir. |
| Kamera dan lokasi | Periksa setiap pos dari dalam, dekat batas, dan di luar radius. Ukur salah terima, salah tolak dan penerimaan foto/video pada sampel uji terpisah sesuai bagian 3 PRD. |
| Aksesibilitas | Amati warga senior menyelesaikan presensi pertama tanpa bantuan, memperbesar teks, dan mencoba kembali setelah izin lokasi atau kamera ditolak. |
| Privasi | Tetapkan kontak RT dan penyedia pemrosesan, lokasi penyimpanan, dasar pemrosesan, risiko serta mitigasi. Uji permintaan akses, koreksi, penghapusan dan penghapusan ulang setelah restore. |
| Insiden | Simulasikan laporan kebocoran dari operator platform ke RT. Catat waktu penemuan, cakupan dan tindakan guna membantu RT memenuhi tenggat pemberitahuan yang berlaku. |
