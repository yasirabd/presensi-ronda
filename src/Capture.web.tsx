// Web only. Capturing one frame requires only the browser's local camera API.
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { toByteArray } from 'base64-js';
import { Body, Button } from './ui';

export function jpegBytes(photo: string): Uint8Array<ArrayBuffer> {
  return toByteArray(photo).slice();
}

export default function Capture({onCapture,onCancel}: {
  onCapture: (base64: string) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const preview = useRef<HTMLVideoElement>(null);
  const media = useRef<MediaStream | null>(null);
  const mounted = useRef(false);
  const [active,setActive] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  function stop() {
    media.current?.getTracks().forEach(track => track.stop());
    media.current = null;
  }
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stop(); };
  }, []);
  async function start() {
    setBusy(true); setMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640}},audio:false});
      if (!mounted.current || !preview.current) { stream.getTracks().forEach(track=>track.stop()); return; }
      media.current = stream;
      preview.current.srcObject = stream;
      await preview.current.play();
      if (mounted.current) setActive(true);
    } catch {
      stop();
      if (mounted.current) setMessage('Periksa izin kamera browser, lalu coba lagi.');
    } finally { if (mounted.current) setBusy(false); }
  }
  async function take() {
    const video = preview.current;
    if (!video?.videoWidth || !video.videoHeight) { setMessage('Kamera sedang bersiap. Coba lagi.'); return; }
    setBusy(true); setMessage('');
    try {
      const scale = Math.min(1,640 / Math.max(video.videoWidth,video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext('2d')!.drawImage(video,0,0,canvas.width,canvas.height);
      await onCapture(canvas.toDataURL('image/jpeg',0.84).split(',')[1]);
      stop();
      if (mounted.current) setActive(false);
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : 'Pengambilan foto gagal.');
    } finally { if (mounted.current) setBusy(false); }
  }
  return <View style={{gap:12}}>
    <video muted playsInline ref={preview} aria-label="Pratinjau kamera depan" style={{display:active?'block':'none',width:'100%',maxHeight:400,borderRadius:12}}/>
    <Body>{active?'Hadapkan wajah ke kamera di tempat yang cukup terang.':'Izinkan kamera depan untuk mengambil foto wajah.'}</Body>
    {!!message && <Body>{message}</Body>}
    <Button label={active?'Ambil foto wajah':'Izinkan kamera'} onPress={active?take:start} disabled={busy}/>
    {onCancel && <Button secondary label="Tutup kamera" onPress={onCancel} disabled={busy}/>}
  </View>;
}
