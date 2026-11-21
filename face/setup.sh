#!/bin/sh
set -eu
cd "$(dirname "$0")"
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
mkdir -p models
cd models
download() {
  curl --fail --location --silent --show-error "$2" -o "$1.tmp"
  printf '%s  %s\n' "$3" "$1.tmp" | sha256sum -c -
  mv "$1.tmp" "$1"
}
base=https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models
download yunet.onnx "$base/face_detection_yunet/face_detection_yunet_2023mar.onnx" 8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4
download sface.onnx "$base/face_recognition_sface/face_recognition_sface_2021dec.onnx" 0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79
download pad.onnx https://storage.openvinotoolkit.org/repositories/open_model_zoo/public/2022.1/anti-spoof-mn3/anti-spoof-mn3.onnx c4c99af04603b62d7e44f6f4daeb33e0daeccc696008c0b1d62f6f5cebbb3262
