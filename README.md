# Ronda Pak

Aplikasi SaaS presensi ronda RT menggunakan Expo Router, React Native untuk Android, iOS dan web, Zustand, Supabase Auth dan Postgres.

## Menjalankan lokal

Gunakan Node 22.18+ atau 24. Jalankan `npm ci`, salin `.env.example` ke `.env.local`, lalu isi konfigurasi Supabase dan URL web publik. Terapkan migrasi SQL di `supabase/migrations` sesuai urutan. Aktifkan konfirmasi email dan pemulihan kata sandi di Supabase Auth serta izinkan URL kembali ke aplikasi web. Untuk OAuth native, daftarkan skema `rondapak://masuk` dengan parameter yang digunakan aplikasi.

| Target | Perintah |
| --- | --- |
| Web produksi lokal | `npm run build` kemudian `npm start` |
| Web dengan Metro | `npm run web` |
| Android | `npm run android` |
| iOS melalui macOS | `npm run ios` |

Server Node menyajikan ekspor web dan API pada port 3000. Saat memakai Metro, jalankan API di terminal kedua dengan `npm start`; arahkan `EXPO_PUBLIC_API_URL` ke server tersebut. Untuk HP, gunakan URL HTTPS yang dapat diakses perangkat. `EXPO_PUBLIC_WEB_URL` menentukan tujuan undangan dan tautan email. Variabel `EXPO_PUBLIC_*` masuk dalam bundle klien, sehingga hanya boleh memuat konfigurasi publik. Simpan kunci wajah di server.

Tema terang dan gelap, maskot, tipografi, jarak, kontrol dan pesan status dijelaskan dalam [design system Owl](docs/owl-design-system.md). Zustand menyimpan ruang RT aktif dan status sesi dalam memori. Supabase mengelola persistensi sesi melalui penyimpanan browser dan SecureStore di perangkat.

Pengurus memilih **Daftarkan RT**, membuat akun email dan kata sandi, lalu melengkapi wilayah RT setelah konfirmasi email. Setelah membuat RT, pengurus mengirim undangan pribadi ke WhatsApp warga. Warga mengisi data sekaligus merekam wajah, lalu mengonfirmasi email. Pengajuan masuk ke pengurus setelah email dikonfirmasi. Warga yang melewati kamera dapat mendaftarkan wajah setelah disetujui pengurus. Setelah warga bergabung, pemilik dapat menetapkan titik pos. Warga bisa presensi di pos tanpa jadwal. Presensi mandiri dicatat sekali per warga per hari menurut zona waktu RT.

Periksa build dengan `npm run build` dan tipe dengan `npm run typecheck`. Sebelum pilot, uji login email dan isolasi dua RT dengan akun terpisah. Pemilik dapat mencatat presensi manual per giliran, mengoreksi dengan alasan, dan mengunduh CSV per bulan serta warga. Pengurus mengambil titik pos di Pengaturan RT. Warga memeriksa lokasi presensi melalui HTTPS atau localhost. Persetujuan pengajuan oleh pengurus mengizinkan atau mengaktifkan pendaftaran wajah warga. Warga menyetujui penggunaan templat per RT, mendaftarkan wajah, lalu bisa presensi dengan lokasi dan kamera. Dasbor juga menyediakan kontak privasi, permintaan warga, dan pencabutan persetujuan.

## Layanan wajah

Server Node menjalankan Python/OpenCV di CPU. Dari root proyek jalankan `sh face/setup.sh` dengan Python 3.11, modul venv, dan curl. Skrip memverifikasi checksum model. Pada server, isi `FACE_SIGNING_KEY` dengan nilai heksadesimal dari `select encode(secret,'hex') from ronda_private.face_secret where id` melalui koneksi admin. Buat `FACE_TEMPLATE_KEY` dengan 32 byte acak dalam heksadesimal dan simpan stabil di secret manager. Kedua kunci hanya untuk server.

Deteksi menggunakan YuNet, pencocokan menggunakan SFace, dan pemeriksaan wajah hidup pasif menggunakan anti-spoof-mn3. Kamera mengirim satu JPEG melalui HTTPS. Server memprosesnya di memori, menyimpan templat dengan AES-256-GCM, dan mencatat kehadiran setelah database memeriksa tanda tangan server, versi pendaftaran serta sesi lokasi. Ambang awal untuk eksperimen adalah 0,95 untuk skor wajah hidup dan 0,5 untuk kemiripan kosinus. Uji foto, video, unggahan ulang gambar digital, HP lama, kacamata, dan pencahayaan pos. Tetapkan kesiapan biometrik dengan pengukuran yang disyaratkan PRD. Presensi manual tersedia selama validasi.

Untuk hosting, Dockerfile menyertakan Python dan bobot model. Berikan kedua variabel publik Supabase sebagai build arguments serta kedua kunci rahasia saat runtime. Jalankan di belakang HTTPS dan batasi laju permintaan pada endpoint kamera. Model OpenCV dan anti-spoof diperoleh dari [OpenCV Zoo](https://github.com/opencv/opencv_zoo) dan [Open Model Zoo](https://github.com/openvinotoolkit/open_model_zoo/tree/master/models/public/anti-spoof-mn3).

## Verifikasi dan operasional

Jalankan `npm test` untuk regresi migrasi Postgres lokal, `npm run typecheck`, dan `npm run build`. Pengujian lokal menggunakan identitas dan templat sintetis. Terapkan migrasi draf, penjadwalan, dan pemeriksaan undangan sebelum membuka alur baru. Di lingkungan uji, pastikan konfirmasi email wajib dan tautan konfirmasi mempertahankan parameter undangan. Uji kirim ulang dan buka tautan dari profil browser baru. Pastikan proxy hosting menambahkan IP sumber ke ujung kanan `X-Forwarded-For` untuk pembatasan permintaan per IP. Job setiap lima menit membersihkan draf yang melewati masa berlaku hingga dua hari. Job harian menghapus giliran berusia lebih dari 12 bulan beserta catatan kehadirannya serta membersihkan bukti lokasi dan undangan kedaluwarsa.

Sebelum melibatkan warga, pengurus perlu mengisi kontak privasi RT, menuntaskan penilaian dampak bersama pengelola platform, mengukur akurasi dengan relawan yang menyetujui uji, memilih backup terenkripsi dengan retensi maksimal 30 hari, menguji pemulihan serta penghapusan ulang, dan menyimulasikan notifikasi insiden. Saat menarik persetujuan, warga langsung kehilangan templat aktif. Setelah pemulihan, terapkan kembali permintaan penghapusan yang diterima sejak snapshot sebelum membuka akses. Sasaran pilot empat minggu dan ukuran keberhasilan ada di [PRD](prd/README.md).

## Pemeriksaan sebelum pilot empat minggu

| Pemeriksaan | Bukti yang perlu dicatat |
| --- | --- |
| Akun dan akses | Masuk melalui email di Android dan iPhone, uji pemilik dan warga pada dua RT, pindahkan peran kemudian pastikan akses lama berakhir. |
| Kamera dan lokasi | Periksa setiap pos dari dalam, dekat batas, dan di luar radius. Ukur salah terima, salah tolak dan penerimaan foto/video pada sampel uji terpisah sesuai bagian 3 PRD. |
| Aksesibilitas | Amati warga senior menyelesaikan presensi pertama tanpa bantuan, memperbesar teks, dan mencoba kembali setelah izin lokasi atau kamera ditolak. |
| Privasi | Tetapkan kontak RT dan penyedia pemrosesan, lokasi penyimpanan, dasar pemrosesan, risiko serta mitigasi. Uji permintaan akses, koreksi, penghapusan dan penghapusan ulang setelah restore. |
| Insiden | Simulasikan laporan kebocoran dari operator platform ke RT. Catat waktu penemuan, cakupan dan tindakan guna membantu RT memenuhi tenggat pemberitahuan yang berlaku. |

## Frontend produksi di Cloudflare Pages

Hubungkan repositori `yasirabd/presensi-ronda` ke proyek **Pages**. Gunakan branch produksi `main`, direktori root repositori, perintah build `npm run build`, dan direktori hasil `dist`. Set `NODE_VERSION=24`. Gunakan URL produksi yang ditampilkan Pages untuk konfigurasi berikut.

| Tempat | Pengaturan | Nilai |
| --- | --- | --- |
| Pages, variabel build | `EXPO_PUBLIC_SUPABASE_URL` | URL proyek Supabase |
| Pages, variabel build | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key proyek |
| Pages, variabel build | `EXPO_PUBLIC_API_URL` | Origin HTTPS layanan Render yang menjalankan API, tanpa path |
| Render, variabel runtime | `FRONTEND_ORIGIN` | Origin HTTPS frontend Pages atau domain khusus produksi |
| Supabase Auth, URL Configuration | Site URL dan Redirect URLs | URL beranda produksi. Izinkan juga URL kembali ke beranda dengan parameter pemulihan dan undangan sesuai pola redirect Supabase. |

Kosongkan `EXPO_PUBLIC_WEB_URL` pada build Pages agar undangan dan tautan konfirmasi menggunakan origin web aktif. Simpan kedua kunci biometrik hanya di Render. Deploy ulang backend setelah mengatur origin dan build ulang Pages setelah mengubah variabel publik. Frontend mengirim foto langsung ke API Render melalui HTTPS. CORS backend mengizinkan origin frontend produksi persis seperti yang dikonfigurasi. Preview Pages memerlukan backend uji dengan origin preview tersendiri untuk menguji kamera dari awal hingga akhir.
