import {createCipheriv,createDecipheriv,createHmac,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';

const limit=400000;
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
export async function POST(request:Request) {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const signer=process.env.FACE_SIGNING_KEY, encryption=process.env.FACE_TEMPLATE_KEY;
  if(!url||!publicKey||!signer||!encryption)return Response.json({error:'Verifikasi wajah belum diaktifkan. Hubungi pengurus.'},{status:503});
  const headers=request.headers;
  const token=headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if(!token)return Response.json({error:'Masuk kembali.'},{status:401});
  const db=createClient(url,publicKey,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
  const {data:{user}}=await db.auth.getUser(token);
  if(!user)return Response.json({error:'Sesi masuk berakhir.'},{status:401});
  const rt=headers.get('x-rt'), action=headers.get('x-action');
  if(!rt||!['enroll','verify'].includes(action||'') || !request.body || (action==='enroll' && headers.get('x-consent')!=='v1'))return Response.json({error:'Permintaan tidak lengkap.'},{status:400});
  if(running>=2)return Response.json({error:'Layanan sibuk. Coba sebentar lagi.'},{status:429});
  const key=Buffer.from(encryption,'hex');
  const aad=Buffer.from(rt+'/'+user.id);
  async function operation(fields:Record<string,unknown>) {
    const payload=JSON.stringify({...fields,user:user!.id,rt,expires:Math.floor(Date.now()/1000)+60});
    const signature=createHmac('sha256',Buffer.from(signer!,'hex')).update(payload).digest('hex');
    const {data,error}=await db.rpc('face_operation',{payload,signature});
    if(error)throw new Error(error.code==='P0001'?error.message:'Pendaftaran tidak tersedia. Hubungi pengurus.');
    return data;
  }
  running++;
  try {
    const profile=await operation({action:'read'});
    if((action==='enroll')===Boolean(profile.template))throw new Error('Periksa status pendaftaran wajah.');
    const reader=request.body.getReader(), chunks:Uint8Array[]=[];
    let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Gambar terlalu besar.')}chunks.push(value)}
    const vector=await embedding(Buffer.concat(chunks));
    if(action==='enroll'){
      const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,iv);
      cipher.setAAD(aad);
      const encrypted=Buffer.concat([cipher.update(Buffer.from(new Float32Array(vector).buffer)),cipher.final()]);
      const template=Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');
      return Response.json(await operation({action,version:profile.version,template}));
    }
    const raw=Buffer.from(profile.template,'base64');
    const decipher=createDecipheriv('aes-256-gcm',key,raw.subarray(0,12));
    decipher.setAAD(aad);decipher.setAuthTag(raw.subarray(12,28));
    const reference=Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]);
    const score=vector.reduce((sum,v,i)=>sum+v*reference.readFloatLE(4*i),0);
    if(score<0.5)throw new Error('Wajah belum cocok. Coba lagi atau hubungi pengurus.');
    return Response.json(await operation({action,version:profile.version,shift:headers.get('x-shift'),session:headers.get('x-location-session')}));
  } catch(error){
    const message=error instanceof Error && /^[A-Z][^\n]{0,100}[.!]$/.test(error.message)?error.message:'Verifikasi gagal. Coba lagi atau hubungi pengurus.';
    return Response.json({error:message},{status:422});
  } finally {running--}
}
