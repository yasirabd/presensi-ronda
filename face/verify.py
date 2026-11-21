"""Read one camera JPEG on stdin. Return an embedding only for a single live face."""
import os
os.environ["OPENCV_IO_MAX_IMAGE_PIXELS"] = "2000000"
import json
from pathlib import Path
import sys
import cv2
import numpy as np

MODELS = Path(__file__).parent / "models"
cv2.setNumThreads(1)


def analyze(image):
    height, width = image.shape[:2]
    detector = cv2.FaceDetectorYN.create(str(MODELS / "yunet.onnx"), "", (width, height), 0.9)
    _, faces = detector.detect(image)
    if faces is None or len(faces) != 1:
        raise ValueError("Pastikan hanya wajah Anda terlihat dan cahaya cukup.")
    face = faces[0]
    x, y, w, h = map(int, face[:4])
    crop = image[max(0, y):min(height, y+h), max(0, x):min(width, x+w)]
    if min(crop.shape[:2]) < 80:
        raise ValueError("Dekatkan wajah ke kamera.")
    rgb = cv2.cvtColor(cv2.resize(crop, (128, 128)), cv2.COLOR_BGR2RGB)
    normalized = (rgb.astype(np.float32) - [151.2405,119.5950,107.8395]) / [63.0105,56.4570,55.0035]
    pad = cv2.dnn.readNetFromONNX(str(MODELS / "pad.onnx"))
    pad.setInput(normalized.transpose(2,0,1)[None].astype(np.float32))
    confidence = float(pad.forward().ravel()[0])
    if not 0.95 <= confidence <= 1:
        raise ValueError("Wajah hidup belum terverifikasi. Coba lagi dengan cahaya lebih terang.")
    recognizer = cv2.FaceRecognizerSF.create(str(MODELS / "sface.onnx"), "")
    vector = recognizer.feature(recognizer.alignCrop(image, face)).flatten()
    return (vector / np.linalg.norm(vector)).tolist()


if __name__ == "__main__":
    raw = sys.stdin.buffer.read(400001)
    try:
        if not raw.startswith(b"\xff\xd8") or len(raw)>400000:
            raise ValueError("Gambar kamera tidak sesuai.")
        image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Gambar kamera tidak terbaca.")
        print(json.dumps({"vector":analyze(image)}, allow_nan=False))
    except ValueError as error:
        print(json.dumps({"error":str(error)}))
