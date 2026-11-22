'use client';
import {useEffect,useRef} from 'react';
import Link from 'next/link';

export function Introduction() {
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const seenKey='ronda-pak:petunjuk-awal:v1';
  function remember() {
    try { localStorage.setItem(seenKey,'1'); } catch { /* Storage can be unavailable in private browsing. */ }
  }
  useEffect(()=>{
    if(location.search || location.hash)return;
    try { if(localStorage.getItem(seenKey))return; } catch { /* Show the guide for this visit. */ }
    dialog.current?.showModal();
  },[]);
  return <div className="intro">
    <div className="intro-copy">
      <h1>Presensi ronda dari HP</h1>
      <p>Datang ke pos ronda, lalu catat kehadiran dengan lokasi dan kamera depan.</p>
      <div className="intro-actions">
        <Link href="/daftar">Buat akun</Link>
        <Link href="/masuk">Masuk</Link>
      </div>
      <button ref={trigger} className="guide-trigger" onClick={()=>dialog.current?.showModal()}>Cara pakai Ronda Pak</button>
    </div>
    <figure><img src="/ronda-bersama.webp" width="1200" height="900" alt="Tiga bapak lintas generasi berjaga di pos ronda di tepi gang perumahan."/></figure>
    <dialog className="welcome-guide" ref={dialog} aria-labelledby="guide-title"
      onClose={()=>{remember();trigger.current?.focus();}}>
      <img src="/ronda-pak-owl.png" width="56" height="56" alt=""/>
      <h2 id="guide-title">Pertama kali pakai Ronda Pak?</h2>
      <p>Pilih panduan warga atau pengurus RT.</p>
      <div className="intro-roles">
        <details name="panduan-peran">
          <summary>Cara absen sebagai warga</summary>
          <ol>
            <li><strong>Gabung RT.</strong> Buka undangan dari pengurus. Masuk dengan alamat email yang diundang, lalu pilih Gabung RT.</li>
            <li><strong>Daftarkan wajah sekali.</strong> Isi nama dan alamat di Data warga saya. Setelah pengurus menyetujui pendaftaran, buka Pendaftaran wajah saya dan ikuti petunjuk kamera.</li>
            <li><strong>Absen di pos ronda.</strong> Di pos ronda, pilih Absen sekarang dan izinkan lokasi. Buka kamera depan, lalu pilih Verifikasi kehadiran. Status Hadir berarti presensi sudah tercatat.</li>
          </ol>
        </details>
        <details name="panduan-peran">
          <summary>Cara menyiapkan RT</summary>
          <ol>
            <li><strong>Buat RT.</strong> Setelah masuk, pilih Daftarkan RT baru. Isi nomor RT, RW, dan pilih wilayah, lalu pilih Buat RT.</li>
            <li><strong>Undang warga.</strong> Di menu Undang warga, buat tautan untuk email warga dan bagikan. Setelah warga bergabung, periksa identitasnya di menu Verifikasi identitas warga.</li>
            <li><strong>Atur lokasi pos.</strong> Saat berada di pos ronda, buka Pengaturan RT dan pilih Gunakan lokasi sekarang, lalu simpan. Nama pos mengikuti nama RT.</li>
            <li><strong>Lihat kehadiran.</strong> Buka Rekap presensi untuk memeriksa siapa yang hadir atau mengunduh rekap CSV.</li>
          </ol>
        </details>
      </div>
      <button onClick={()=>dialog.current?.close()}>Lanjut ke beranda</button>
      <Link href="/masuk" onClick={remember}>Lewati dan masuk</Link>
    </dialog>
  </div>;
}
