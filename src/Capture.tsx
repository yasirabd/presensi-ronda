import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { deleteAsync } from 'expo-file-system/legacy';
import { toByteArray } from 'base64-js';
import { Body, Button } from './ui';

export function jpegBytes(photo: string): Uint8Array<ArrayBuffer> {
  return toByteArray(photo).slice();
}

type CaptureProps = {
  onCapture: (base64: string) => Promise<void> | void;
  onCancel?: () => void;
};

export default function Capture({ onCapture, onCancel }: CaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const camera = useRef<CameraView>(null);
  const mounted = useRef(false);
  const takingPicture = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function allowCamera() {
    try {
      const result = await requestPermission();
      if (!result.granted) setMessage('Izinkan akses kamera di pengaturan perangkat untuk mengambil foto wajah.');
    } catch {
      setMessage('Kamera tidak tersedia. Periksa izin kamera pada perangkat Anda.');
    }
  }

  async function takePhoto() {
    if (!ready || !camera.current || takingPicture.current) return;
    takingPicture.current = true;
    setBusy(true);
    setMessage('');
    const cachedFiles = new Set<string>();
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.85 });
      if (!picture?.uri) throw new Error('Gambar kamera belum siap. Coba lagi.');
      cachedFiles.add(picture.uri);
      if (!mounted.current) return;
      const resize = picture.width >= picture.height
        ? { width: Math.min(picture.width, 640) }
        : { height: Math.min(picture.height, 640) };
      const jpeg = await manipulateAsync(picture.uri, [{ resize }], {
        compress: 0.84, format: SaveFormat.JPEG, base64: true,
      });
      cachedFiles.add(jpeg.uri);
      if (!jpeg.base64) throw new Error('Foto gagal dibaca. Ambil foto kembali.');
      if (mounted.current) await onCapture(jpeg.base64.replace(/^data:image\/jpeg;base64,/, ''));
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : 'Foto gagal diproses. Coba lagi.');
    } finally {
      if (Platform.OS === 'web') {
        for (const uri of cachedFiles) {
          if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
        }
      } else {
        await Promise.all([...cachedFiles].map(uri => deleteAsync(uri, { idempotent: true }).catch(() => {})));
      }
      takingPicture.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <View style={styles.container}>
    {permission?.granted ? <>
      <CameraView ref={camera} style={styles.preview} facing="front" mode="picture"
        onCameraReady={() => setReady(true)}
        onMountError={() => { setReady(false); setMessage('Kamera depan gagal dibuka. Tutup kamera dan coba lagi.'); }} />
      <Body>Hadapkan wajah ke kamera di tempat yang cukup terang.</Body>
      <Button label={busy ? 'Memproses foto…' : 'Ambil foto wajah'} disabled={!ready || busy} onPress={takePhoto} />
    </> : <>
      <Body>Akses kamera depan diperlukan untuk mengambil foto wajah.</Body>
      <Button label="Izinkan kamera" onPress={allowCamera} />
    </>}
    {message ? <Body>{message}</Body> : null}
    {onCancel && <Button label="Tutup kamera" secondary disabled={busy} onPress={onCancel} />}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  preview: { width: '100%', aspectRatio: 1, maxHeight: 400, borderRadius: 12, overflow: 'hidden' },
});
