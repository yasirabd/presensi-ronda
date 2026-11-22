import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';

export const faceImageLimit=400000;
let running=0;
async function embedding(bytes:Buffer):Promise<number[]> {
  const python=process.env.FACE_PYTHON || path.resolve('face/.venv/bin/python');
  const child=spawn(python,[path.resolve('face/verify.py')],{stdio:['pipe','pipe','ignore'],timeout:15000});
  const finished=new Promise<void>((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error('Model wajah belum siap.')))});
  void finished.catch(()=>{});
  child.stdin.on('error',()=>{});
  child.stdin.end(bytes);
  let output='';
  for await(const part of child.stdout)output+=part;
  await finished;
  const result=JSON.parse(output);
  if(result.error)throw new Error(result.error);
  if(!Array.isArray(result.vector)||result.vector.length!==128||!result.vector.every(Number.isFinite))throw new Error('Model wajah belum siap.');
  return result.vector;
}
export class FaceModelBusy extends Error {
  constructor(){super('Layanan sibuk. Coba sebentar lagi.');}
}

export async function runFaceModel(bytes:Buffer) {
  if(running>=2)throw new FaceModelBusy();
  running++;
  try {
    return await embedding(bytes);
  } finally {
    running--;
  }
}

export class BodyTooLarge extends Error {
  constructor(){super('Gambar terlalu besar.');}
}

export async function readBytes(stream:ReadableStream<Uint8Array>,limit:number) {
  const reader=stream.getReader();
  const chunks:Uint8Array[]=[];
  let size=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)return Buffer.concat(chunks,size);
    size+=value.length;
    if(size>limit){
      await reader.cancel();
      throw new BodyTooLarge();
    }
    chunks.push(value);
  }
}

export function sealFace(vector:Buffer|number[],key:Buffer,aad:Buffer) {
  const iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(aad);
  const bytes=Buffer.isBuffer(vector)?vector:Buffer.from(new Float32Array(vector).buffer);
  const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64');
}

export function openFace(template:string,key:Buffer,aad:Buffer) {
  const raw=Buffer.from(template,'base64');
  const decipher=createDecipheriv('aes-256-gcm',key,raw.subarray(0,12));
  decipher.setAAD(aad);
  decipher.setAuthTag(raw.subarray(12,28));
  return Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]);
}
