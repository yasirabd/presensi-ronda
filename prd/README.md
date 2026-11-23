# Ronda Pak — PRD SaaS Presensi Ronda RT

## Cakupan MVP terkini

Warga bisa melakukan presensi di pos setelah verifikasi wajah dan lokasi berhasil. Presensi mandiri berlaku sekali per hari menurut zona waktu RT dan bisa dimulai kapan saja. Riwayat presensi yang sudah tercatat tetap tersedia.

Setiap RT memiliki nomor RT, nomor RW, kelurahan atau desa, kecamatan, serta kabupaten atau kota. Formulir wilayah menggunakan API referensi administrasi. Titik pos ditetapkan oleh pengurus di lokasi pos dan dipakai untuk memeriksa jarak saat warga presensi.

Data warga mencakup nama dan alamat rumah per keanggotaan RT. Pengurus mengelolanya melalui tabel Warga pada RT aktif. Bagian penjadwalan dalam rancangan awal di bawah ini merupakan catatan historis. Cakupan terkini menjadi acuan untuk perubahan berikutnya.


### Audit undangan warga

Peran yang ditampilkan kepada pengguna terdiri dari **Pengurus RT** dan **Warga**. Undangan yang diterima memberikan peran Warga. Satu pengurus memegang hak menunjuk pengurus lain dan dapat mengalihkannya kepada anggota lain.

Pada uji Chromium dengan delapan anggota demo, formulir undangan berada di bawah daftar. Setelah membuat undangan, aplikasi menampilkan URL sebagai teks dan pengurus harus menyalinnya sendiri. Untuk mencabut undangan, pengurus berpindah ke Pengaturan RT dan membuka Kontak privasi dan undangan. Undangan berlaku dua hari dan terikat pada email penerima.

Tindakan **Undang warga** dan daftar **Undangan aktif** berada di bagian atas menu Warga. Pengurus dapat menyalin atau membagikan tautan lewat chat pribadi WhatsApp dan mencabut undangan selama masih aktif. Setiap tautan berlaku dua hari dan hanya bisa digunakan dengan email penerima.

### Pendaftaran pengurus dari beranda

Tindakan utama **Daftarkan RT** membuka formulir email dan kata sandi. Dalam pilot, pendaftar menyatakan sendiri bahwa ia pengurus. Setelah email dikonfirmasi, aplikasi langsung membuka **Siapkan RT Anda** untuk mengisi RT, RW, dan wilayah. Saat ruang RT disimpan, hak pengurus berlaku di ruang tersebut. Tombol **Masuk** dipakai oleh warga dan pengurus yang sudah punya akun.

### Undangan melalui WhatsApp

Pengurus mengisi nama dan nomor WhatsApp, lalu mengirim tautan pribadi ke nomor warga. Tautan berlaku dua hari. Aplikasi memeriksa tautan sebelum menampilkan formulir. Untuk akun baru, tautan aktif membuka satu halaman berisi formulir nama, nomor WhatsApp, alamat rumah, email, dan kata sandi, beserta kamera. Warga menekan **Daftar**, lalu mengonfirmasi email dari perangkat mana pun. Setelah konfirmasi, pengajuan langsung masuk ke pengurus. Draf privat terikat pada email dan undangan. Supabase Auth mengelola kata sandi. Warga yang sudah punya akun terkonfirmasi dapat masuk dan mengirim pengajuan dari satu halaman.

Keanggotaan aktif setelah pengurus memeriksa identitas dan memberi satu persetujuan pada menu Warga. Jika warga menyertakan wajah, persetujuan itu juga mengaktifkan templat wajah. Warga yang melewati kamera dapat mendaftarkan wajah setelah disetujui pengurus dan sebelum presensi mandiri pertama. Presensi manual tetap tersedia. Foto diproses di memori dan templat wajah disimpan terenkripsi. Draf dihapus setelah konfirmasi, pencabutan atau kedaluwarsa undangan, dengan masa berlaku paling lama dua hari. Templat pengajuan dihapus jika pengajuan dibatalkan atau undangan kedaluwarsa. Nomor WhatsApp warga tersimpan bersama profil RT dan hanya tersedia bagi warga yang bersangkutan serta pengurus RT-nya.

Undangan lama yang ditujukan ke email tetap dapat digunakan selama masih aktif.

## 1. Ringkasan Eksekutif

**Masalah.** Pengurus RT kesulitan merekap kehadiran ronda dan membutuhkan ruang kerja yang bisa dikelola sendiri. Banyak peserta adalah warga lanjut usia yang perlu bisa mengisi presensi sendiri dari HP.

**Solusi.** Satu layanan web menyediakan ruang kerja mandiri untuk tiap RT. Aplikasi mencatat kehadiran pada jadwal ronda dengan verifikasi wajah satu banding satu dan pemeriksaan lokasi HP di sekitar pos ronda untuk giliran tersebut. Pengurus RT mengelola jadwal dan melihat rekap, serta dapat mencatat kehadiran setelah memeriksa warga secara langsung.

**Target usulan untuk pilot satu RT selama empat minggu**

| Ukuran | Target dan cara ukur |
| --- | --- |
| Kemandirian warga lanjut usia | ≥80% peserta uji lanjut usia menyelesaikan presensi sendiri pada percobaan pertama setelah pendaftaran, di HP masing-masing |
| Waktu presensi | Median ≤30 detik sejak mengetuk tombol presensi hingga menerima konfirmasi, untuk alur mandiri yang berhasil |
| Waktu membuat rekap | Pengurus menghasilkan rekap mingguan dalam ≤5 menit pada tiga dari empat minggu pilot |
| Aktivasi ruang kerja | Dua pengurus dari RT uji berbeda masing-masing membuat ruang kerja, mengundang warga, dan menerbitkan jadwal pertama dalam ≤15 menit tanpa bantuan operator layanan |
| Kelengkapan rekap | ≥95% slot memiliki status akhir hadir atau tidak hadir dalam 24 jam setelah shift selesai |

## 2. Pengalaman Pengguna dan Fungsionalitas

**Persona.** Warga peserta ronda menggunakan HP pribadi dan memiliki tingkat kenyamanan yang beragam dengan kamera dan aplikasi. Pengurus RT mengatur jadwal, membantu pendaftaran, menangani kendala presensi, dan merekap hasil.

| Cerita pengguna | Kriteria penerimaan |
| --- | --- |
| Sebagai pengurus, saya ingin mendaftarkan RT agar dapat mengelola ronda sendiri. | Setelah masuk, pengurus membuat ruang kerja dengan nama RT, wilayah dan zona waktu, lalu mengatur pos dan mengirim undangan. Aplikasi memberi tautan unik yang bisa dibagikan. Undangan hanya berlaku untuk RT dan peran yang ditetapkan. |
| Sebagai warga, saya ingin bergabung ke RT lewat undangan agar dapat melihat jadwal yang tepat. | Undangan menampilkan nama RT dan wilayah sebelum warga bergabung. Akun dengan beberapa keanggotaan dapat berpindah RT dan selalu melihat nama RT yang sedang aktif. |
| Sebagai warga, saya ingin melihat kapan saya bertugas agar tahu kapan harus presensi. | Setelah masuk, beranda menampilkan jadwal terdekat, jam setempat, dan status presensi. Beranda juga menampilkan nama pos ronda. Tombol **Presensi sekarang** muncul ketika jadwalnya aktif. Di luar jam presensi, layar menampilkan kapan presensi dibuka. |
| Sebagai warga, saya ingin mendaftarkan wajah dengan bantuan pengurus agar bisa presensi dari HP sendiri. | Pengurus memeriksa identitas warga, aplikasi menjelaskan penggunaan data dan pilihan manual sebelum meminta persetujuan, lalu kamera memberi panduan singkat dalam bahasa Indonesia. Aplikasi mengonfirmasi hasil pendaftaran. Warga dapat memilih alur manual langsung. |
| Sebagai warga, saya ingin mengisi presensi dalam beberapa ketukan agar bisa segera ikut ronda. | Dari beranda, warga mengetuk **Presensi sekarang**. Aplikasi menjelaskan izin lokasi, lalu memeriksa posisi di sekitar pos ronda sebelum membuka kamera. Layar memberi satu arahan pada satu waktu. Server hanya mencatat presensi mandiri jika lokasi dan wajah lolos pada sesi yang sama. Setelah server menyimpan presensi, muncul status **Hadir** dengan tanggal dan jam. Percobaan ulang pada jadwal yang sama mengembalikan catatan yang sudah ada. |
| Sebagai warga, saya ingin tetap tercatat ketika kamera bermasalah agar kehadiran saya bisa direkap. | Jika posisi jelas di luar area, aplikasi meminta warga mendekat ke pos. Jika lokasi tidak akurat, aplikasi meminta warga mencoba lagi di tempat terbuka. Jika izin lokasi atau kamera ditolak, aplikasi menunjukkan cara mengaktifkannya kembali. Untuk cahaya kurang, hasil wajah meragukan, atau jaringan putus, aplikasi memberi petunjuk sesuai kendala. Warga dapat mengetuk **Minta bantuan pengurus** untuk melihat cara menghubungi pengurus. Setelah memeriksa kehadiran langsung, pengurus mencatat presensi manual dengan alasan. Kendala lokasi atau kamera tidak langsung mengubah status menjadi tidak hadir. |
| Sebagai pengurus RT, saya ingin mengelola jadwal dan rekap agar dapat melihat setiap giliran yang sudah atau belum terpenuhi. | Pengurus dapat membuat dan mengubah giliran, menetapkan warga dan pos ronda, mengatur titik serta radius tiap pos, memfilter rekap menurut tanggal atau warga, serta mengunduh CSV. Status yang ditampilkan meliputi belum presensi, hadir melalui verifikasi wajah dan lokasi, hadir dicatat pengurus, dan tidak hadir setelah jadwal ditutup. Koreksi mencatat siapa yang mengubah, kapan, dan alasannya. |

**Aksesibilitas HP.** Gunakan tata letak satu kolom, teks isi minimal 18 px, target sentuh minimal 48 × 48 px, kontras sesuai WCAG AA, dan label yang bisa dibaca TalkBack serta VoiceOver. Status memakai teks dan tidak mengandalkan warna. Alur utama tetap bisa dipakai saat teks diperbesar hingga 200%. Uji pada lebar 320 px ke atas dengan perangkat Android dan iPhone yang digunakan warga. Jadwal lintas tengah malam harus menampilkan tanggal mulai dan selesai dengan jelas.

**Di luar cakupan MVP.** Presensisi pulang, pelacakan lokasi berkelanjutan, kamera CCTV, pencarian wajah dari seluruh daftar warga, serta rekap gabungan antar-RT, penagihan otomatis, dan domain kustom.

### Alur registrasi dan aktivasi RT

1. **Pemilik mendaftarkan RT.** Pemilik membuat akun atau masuk, lalu mengisi nama RT, wilayah, dan zona waktu. Setelah ruang kerja dibuat, pemilik bisa menunjuk pengurus.
2. **Pengurus mengundang peserta ronda.** Pengurus membuat undangan per warga. Warga membuka tautan di HP, melihat nama dan wilayah RT, lalu membuat akun atau masuk dan menerima undangan.
3. **Warga mendaftarkan wajah satu kali per RT.** Pengurus memeriksa identitas warga dan dapat mendampingi warga saat membuka kamera. Setelah membaca penjelasan penggunaan data dan memberi persetujuan, warga mengambil sampel wajah dari HP. Sistem mengaktifkan presensi mandiri setelah pendaftaran berhasil. Jika warga menolak, menarik persetujuan, atau pendaftaran belum berhasil, presensi manual tetap tersedia.
4. **Pengurus mengelola ronda.** Di dasbor RT aktif, pengurus melihat status undangan dan kesiapan presensi tiap warga, mengatur pos dan radius, menjadwalkan giliran, serta melihat dan mengunduh rekap. Pengaturan bisa dimulai sambil warga menyelesaikan pendaftaran.
5. **Warga mulai presensi.** Saat gilirannya aktif, warga mengetuk **Presensi sekarang**. Server mencatat hadir setelah lokasi dan verifikasi wajah 1:1 dengan liveness lolos pada sesi yang sama.

**Kriteria penerimaan.** Dasbor membedakan status undangan dan status pendaftaran wajah. Untuk anggota yang sudah bergabung, tampilkan **Belum daftar wajah**, **Siap presensi mandiri**, atau **Presensi manual** sesuai kondisinya, tanpa menampilkan sampel dan templat wajah. Pendaftaran yang gagal bisa diulang tanpa membuat keanggotaan ganda. Akun yang bergabung di RT kedua mengikuti pendaftaran wajah untuk RT tersebut. Warga yang belum mendaftarkan wajah tetap bisa melihat jadwal dan petunjuk meminta bantuan.

### Design system MVP

Antarmuka warga mengutamakan satu tindakan utama per layar. Nama RT dan wilayah terlihat pada undangan, beranda, dan layar konfirmasi. Beranda menempatkan jadwal terdekat, nama pos, dan tombol **Presensi sekarang** dalam urutan baca tersebut. Antarmuka pengurus memakai komponen dan status yang sama, dengan tabel untuk layar lebar dan daftar berlabel pada HP.

| Fondasi | Spesifikasi awal |
| --- | --- |
| Warna | Hijau hutan (#15370D) untuk teks dan tombol utama, krem (#FFF2B4) untuk teks tombol, sage (#728E6D) untuk batas kontrol, dan emas (#E5CD82) untuk aksen. Kartu berwarna putih di atas latar netral terang. |
| Tipografi | Geist Sans dimuat dari aplikasi dengan cadangan sans-serif sistem. Teks isi, tombol dan masukan mulai dari 18 px dengan tinggi baris 1,55. Judul responsif dan satuan relatif mengikuti pembesaran teks pengguna. |
| Tata letak | Skala jarak 4, 8, 12, 16, 24, dan 32 px. Margin awal 16 px di HP dan setiap target sentuh minimal 48 × 48 px. Tombol utama selebar kontainer pada layar sempit. |
| Fokus dan kontras | Teks biasa minimal 4,5:1. Indikator fokus dan batas kontrol yang diperlukan minimal 3:1 terhadap warna di sekitarnya. Gunakan kontrol HTML semantik dan pastikan fokus terlihat serta tidak tertutup saat halaman digulir. |
| Gerak | Beri respons tekan segera. Bila perlu, gunakan transisi 120–180 ms untuk perubahan visual. Hormati `prefers-reduced-motion` dan tampilkan status proses dengan teks. |

**Komponen inti.** Gunakan tombol utama, sekunder, dan bantuan, kartu jadwal, pemberitahuan status dengan ikon dan teks, langkah izin lokasi dan kamera, pratinjau kamera, konfirmasi hadir, serta formulir jadwal dan koreksi pengurus. Definisikan keadaan normal, fokus, ditekan, sedang diproses, berhasil, dan gagal untuk komponen yang relevan. Ikon pendamping teks bersifat dekoratif bagi pembaca layar. Perubahan status proses diumumkan tanpa memindahkan fokus, sedangkan perpindahan ke langkah baru memindahkan fokus ke judul langkah.

| Keadaan presensi | Pesan atau tindakan berikutnya |
| --- | --- |
| Meminta izin lokasi | “Izinkan lokasi untuk mengecek apakah kamu berada di dekat pos ronda.” |
| Sedang memeriksa | “Memeriksa lokasi…” atau “Memeriksa wajah…”, sesuai langkah yang aktif. Cegah pengiriman ganda selama proses berlangsung. |
| Lokasi di luar radius | “Dekati pos ronda, lalu coba lagi.” |
| Lokasi kurang akurat | “Pindah ke tempat terbuka, lalu coba lagi.” |
| Izin ditolak | Tampilkan langkah mengaktifkan izin yang ditolak dan tombol **Minta bantuan pengurus**. |
| Wajah belum terverifikasi atau jaringan putus | Tampilkan penyebab bila diketahui dan tombol **Coba lagi**. Sediakan bantuan pengurus. |
| Berhasil | Tampilkan **Hadir**, nama pos, dan waktu setelah server mengonfirmasi penyimpanan. |

**Kriteria penerimaan desain.** Alur dapat diselesaikan pada lebar 320 px dan pembesaran teks 200% tanpa kehilangan tindakan utama. Uji urutan fokus dengan keyboard, baca label dan perubahan status dengan TalkBack serta VoiceOver, dan cek bahwa pesan tetap jelas tanpa warna dan animasi. Saat meninjau prototipe, amati warga senior menjalankan alur dari beranda sampai konfirmasi dan pulih dari satu kegagalan izin tanpa petunjuk langsung dari penguji.

## 3. Kebutuhan Sistem AI

**Kemampuan.** Kamera depan mengambil sampel saat pendaftaran dan presensi. Sistem memeriksa kualitas gambar, menjalankan pemeriksaan bahwa wajah berasal dari orang yang hadir, lalu membandingkan sampel dengan templat akun yang sedang masuk. Hasil yang berada di bawah ambang atau meragukan memberi opsi coba ulang dan bantuan pengurus. Komponen atau penyedia verifikasi belum dipilih.

**Evaluasi.** Pisahkan data untuk kalibrasi ambang dan pengujian. Dengan persetujuan peserta, uji pencocokan benar, percobaan memakai akun orang lain, dan upaya menggunakan foto cetak atau gambar dan video di layar. Sertakan warga lanjut usia, HP yang dipakai warga, pencahayaan malam, dan pengguna berkacamata. Catat keberhasilan percobaan pertama, tingkat penolakan warga yang benar, penerimaan orang yang salah, penerimaan serangan, dan waktu respons. Laporkan jumlah percobaan serta hasil per kondisi.

**Syarat sebelum pilot.** Target awal pengujian terkontrol adalah penolakan keliru ≤10% pada percobaan warga sah dan penerimaan keliru ≤1% pada percobaan orang lain. Tetapkan ukuran sampel dan ambang penerimaan uji foto dan video sebelum pengujian. Bila sampel belum cukup atau hasil belum memenuhi ambang, gunakan presensi manual sambil menyiapkan pengujian ulang.

## 4. Spesifikasi Teknis

**Arsitektur usulan.** Web responsif melalui HTTPS sebagai titik awal. Satu deployment melayani seluruh RT melalui tautan seperti `/rt/<slug>`. Gunakan ID ruang kerja yang tetap sebagai batas data dan slug sebagai alamat. Akun autentikasi terhubung ke ruang kerja lewat keanggotaan dengan peran pemilik, pengurus, atau warga. Token design system didefinisikan sebagai variabel CSS semantik dan digunakan oleh komponen bersama. Setelah warga masuk dan membuka jadwal aktif, server membuat sesi verifikasi berumur pendek untuk ruang kerja, keanggotaan, dan jadwal tersebut. Kedua hasil pemeriksaan terikat pada sesi itu. Web mengambil posisi baru dan estimasi akurasi melalui Geolocation API. Server memeriksa jarak ke titik pos, umur sampel, dan akurasi. Jika rentang ketidakpastian melintasi batas radius, minta sampel baru. Jika seluruh rentang berada di luar radius, arahkan warga mendekat. Hanya sampel yang memenuhi ambang akurasi dan berada dalam radius setelah memperhitungkan ketidakpastian yang lolos. Kalibrasikan radius dan ambang akurasi di tiap pos saat uji lapangan. Server mencatat presensi secara atomik dengan satu catatan per warga per giliran dalam RT yang sama, termasuk saat koneksi putus dan permintaan diulang. Waktu presensi berasal dari server. Jam buka dan tutup mengikuti zona waktu RT dan dapat diatur pengurus.

**Integrasi.** Layanan autentikasi, pendaftaran ruang kerja, serta undangan dan peran per RT, API jadwal dan presensi, penyimpanan jadwal, konfigurasi pos, dan catatan kehadiran, komponen verifikasi wajah, serta ekspor CSV. Pengurus membantu pembuatan akun dan pemulihan akses. Metode login, penyedia verifikasi, hosting, anggaran, dan tenggat masih perlu diputuskan.

**Keamanan dan privasi.** Minta persetujuan terpisah sebelum membuat templat wajah dan sediakan presensi manual bagi warga yang menolak atau menarik persetujuan. Perlakukan templat wajah sebagai data biometrik sensitif sesuai UU Pelindungan Data Pribadi. Enkripsi templat dan pisahkan penyimpanannya dari data presensi. Hindari penyimpanan foto atau video mentah setelah verifikasi dan keluarkan data biometrik dari log maupun rekap. Validasi keanggotaan dan peran di server pada tiap operasi, termasuk ekspor. Terapkan row-level security di Postgres untuk akses aplikasi dan foreign key yang menyertakan ID RT untuk mencegah relasi antar-RT. Lingkupi anggota, pos, jadwal, presensi, audit, sesi, dan templat biometrik dengan ID RT. Warga melihat jadwal dan catatannya sendiri dalam RT aktif. Pengurus mengelola anggota, pos, jadwal, rekap, dan presensi manual di RT yang dikelolanya. Pemilik dapat mengangkat pengurus dan memindahkan kepemilikan. Undangan kedaluwarsa, dapat dicabut, dan hanya dapat ditebus sekali oleh penerima yang dituju. Pendaftaran wajah dan persetujuan berlaku per RT. Penarikan persetujuan menonaktifkan verifikasi wajah dan memicu penghapusan templat pada RT terkait. Minta lokasi hanya saat warga melakukan presensi. Simpan ID pos dan hasil pemeriksaan lokasi pada catatan yang berhasil, tanpa menyimpan koordinat mentah warga dalam rekap atau log. Setiap RT bertanggung jawab atas pemrosesan data presensinya. Platform memproses data presensi sesuai instruksi RT. Pemilik dan pengurus masuk dengan email dan kata sandi. Akses pengelolaan dan ekspor mengikuti peran pada RT aktif. Cabut akses pengelolaan saat peran dicabut.

**Penyimpanan dan retensi.** Simpan log presensi dan audit koreksi di Supabase Postgres. Simpan satu embedding terenkripsi per anggota per RT di tabel terpisah yang hanya dapat diakses layanan verifikasi. Foto dan video hanya diproses selama sesi. Warga bisa menarik persetujuan dari HP. Saat persetujuan ditarik atau keanggotaan berakhir, segera nonaktifkan verifikasi dan hapus templat dari penyimpanan aktif. Presensi manual tetap tersedia setelah pengurus memeriksa langsung. Simpan log presensi selama 12 bulan dan cadangan maksimal 30 hari. Saat memulihkan cadangan, terapkan kembali penghapusan yang sudah berlaku sebelum membuka akses. Supabase Postgres adalah penyimpanan utama. S3 privat opsional untuk cadangan terenkripsi bila diperlukan, dengan kebijakan retensi yang mencakup versi objek.

**Hak warga dan insiden.** Tampilkan kontak privasi RT. RT memverifikasi identitas pemohon dan menangani akses, koreksi, atau penghapusan, dibantu platform yang mencatat waktu penerimaan, keputusan, serta penyelesaian. Sebelum pilot, selesaikan penilaian dampak pelindungan data, uji pemulihan dan penghapusan ulang, serta simulasikan insiden. Platform segera memberi tahu RT terdampak dan membantu RT memenuhi tenggat pemberitahuan 3 × 24 jam sesuai Pasal 46 UU PDP.

## 5. Risiko dan Peta Jalan

| Tahap | Cakupan |
| --- | --- |
| MVP | SaaS multi-RT dengan pendaftaran ruang kerja dan undangan. Verifikasi isolasi dengan dua RT uji, lalu jalankan pilot empat minggu di satu RT setelah uji perangkat, alur warga lanjut usia, serta verifikasi wajah dan lokasi. Uji izin ditolak, posisi di dalam dan di luar radius, akurasi rendah di batas area, lokasi kedaluwarsa, serta kamera di Safari iPhone dan Chrome Android. Cakup jadwal, presensi wajah dan lokasi, presensi manual, koreksi, serta rekap CSV. |
| v1.1 | Perbaiki alur dengan tingkat kegagalan tertinggi pada pilot. Tambahkan pengingat jadwal bila dibutuhkan warga. |
| v2.0 | Evaluasi kebutuhan pengelolaan tingkat RW, laporan lanjutan, dan model langganan berdasarkan hasil penggunaan. |

| Risiko | Mitigasi |
| --- | --- |
| Data terbuka ke RT lain | Gunakan dua RT uji, termasuk akun yang menjadi pengurus di satu RT dan warga di RT lain. Uji penolakan lintas RT pada API, database, ekspor, sesi verifikasi, dan akses templat. |
| Kamera gagal di malam hari atau pada HP lama | Uji di lokasi ronda, tampilkan panduan pencahayaan, dan sediakan bantuan pengurus. |
| Warga sulit masuk, memberi izin kamera, atau membaca instruksi | Amati warga lanjut usia menyelesaikan alur di HP sendiri, termasuk pendaftaran dan pemulihan saat salah langkah. |
| Lokasi HP meleset atau dapat dipalsukan | Uji radius dan akurasi di pos ronda. Lokasi dari browser merupakan sinyal perangkat. Pengurus dapat memeriksa kehadiran fisik dan mencatat koreksi dengan alasan. |
| Jaringan putus atau verifikasi lambat | Tampilkan status yang jelas, izinkan percobaan ulang tanpa duplikasi, dan gunakan pencatatan manual saat layanan terganggu. |
| Biaya atau ketergantungan penyedia | Ukur biaya per verifikasi, latensi pada HP warga, dan dukungan penghapusan templat sebelum memilih penyedia. |

### Rencana pengembangan MVP

Aplikasi memakai Expo Router, React Native, React Native Web, Zustand, dan TypeScript. Design system Owl mengatur tema siang dan malam, font Nunito, kontrol sentuh, dan penggunaan maskot. Supabase menangani autentikasi dan data multi-RT. API Node menjalankan verifikasi wajah Python di server.

| Urutan | Hasil yang dapat didemokan | Dependensi dan bukti selesai |
| --- | --- | --- |
| 1. Ruang kerja dan jadwal muncul di HP warga | Pemilik mendaftarkan RT dan mengundang warga. Pengurus membuat pos dan giliran serta menugaskan warga. Warga masuk dan melihat jadwal terdekat melalui komponen design system. | Putuskan metode masuk. Uji pembuatan dua RT, undangan kedaluwarsa atau sudah ditebus, perpindahan RT, peran yang berbeda pada akun yang sama, isolasi jadwal, dan giliran lintas tengah malam. |
| 2. Kehadiran manual masuk rekap | Pengurus mencatat atau mengoreksi kehadiran setelah pemeriksaan langsung, lalu mengunduh rekap. | Setelah 1. Uji alasan koreksi, jejak audit, pembatasan peran dan ekspor lintas RT, serta satu catatan per warga per giliran dalam RT yang sama. |
| 3. Lokasi pos bisa diperiksa | Warga menjalankan pemeriksaan lokasi dari jadwal aktif dan menerima arahan sesuai hasil. | Setelah 1. Uji posisi di dalam dan di luar radius, akurasi rendah, sampel kedaluwarsa, izin ditolak, dan percobaan ulang. Kalibrasikan radius di pos ronda. |
| 4. Wajah dan lokasi menghasilkan presensi | Setelah persetujuan dan pendaftaran, warga dapat menyelesaikan presensi dari HP. Hasil tampil pada rekap pengurus. | Setelah 2 dan 3. Uji penyedia pada HP warga saat malam, biaya, penghapusan data, dan ambang evaluasi di bagian 3. Uji bahwa server hanya mencatat kehadiran jika kedua pemeriksaan sah pada sesi yang sama dan sesi serta templat berasal dari RT aktif. |
| 5. Pilot dan evaluasi | Pengurus menjalankan pilot empat minggu dan menilai hasil terhadap target bagian 1. | Setelah 4. Jalankan ulang alur di Safari iPhone dan Chrome Android, cek aksesibilitas, bantuan manual, dan penolakan akses silang pada dua RT uji, serta verifikasi peran, pencabutan akses pengurus, retensi, pemulihan cadangan, penilaian dampak, dan simulasi insiden sebelum melibatkan warga. |

**Cara mengerjakan.** Pakai `grill-me` untuk keputusan terbuka, dimulai dari metode masuk, kriteria lokasi di pos, dan pemilihan penyedia wajah. Gunakan `to-tickets` untuk memecah irisan di atas berdasarkan dependensinya saat menyiapkan backlog. Sebelum menulis kode pada tiap irisan, pakai `writing-plans` dari Superpowers untuk menetapkan file yang berubah dan skenario verifikasi. Uji aturan presensi dengan input terkontrol, uji alur warga dan pengurus lewat Playwright, lalu catat bukti uji perangkat fisik untuk kamera, GPS, dan pembaca layar.

**Definisi selesai per irisan.** Kriteria penerimaan terkait memiliki hasil uji yang bisa diperiksa. Jalankan uji alur utama serta skenario kegagalan yang berubah, periksa akses warga dan pengurus, lalu catat hasil aktual serta kondisi yang masih perlu diuji. Tinjau UI memakai `better-accessibility`, `better-interface`, dan Impeccable. Tinjau respons tekan atau transisi dengan `emil-design-eng`. Gunakan `verification-before-completion` sebelum menandai irisan selesai.
