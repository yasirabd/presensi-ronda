import {createHmac} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {faceImageLimit, readBytes, runFaceModel, sealFace, openFace, FaceModelBusy} from './face-model.ts';

export async function POST(request:Request) {
  const url=(process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL), publicKey=(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const signer=process.env.FACE_SIGNING_KEY, encryption=process.env.FACE_TEMPLATE_KEY;
  if(!url||!publicKey||!signer||!encryption)return Response.json({error:'Verifikasi wajah belum diaktifkan. Hubungi pengurus.'},{status:503});
  const headers=request.headers;
  const token=headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if(!token)return Response.json({error:'Masuk kembali.'},{status:401});
  const db=createClient(url,publicKey,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
  const {data:{user}}=await db.auth.getUser(token);
  if(!user)return Response.json({error:'Sesi masuk berakhir.'},{status:401});
  const rt=headers.get('x-rt'), action=headers.get('x-action'), invite=headers.get('x-join-invite');
  if(!rt||!['enroll','verify'].includes(action||'') || (invite && action!=='enroll') || !request.body || (action==='enroll' && headers.get('x-consent')!=='v1'))return Response.json({error:'Permintaan tidak lengkap.'},{status:400});
  const key=Buffer.from(encryption,'hex');
  const aad=Buffer.from(rt+'/'+user.id);
  async function operation(fields:Record<string,unknown>) {
    const payload=JSON.stringify({...fields,invite,user:user!.id,rt,expires:Math.floor(Date.now()/1000)+60});
    const signature=createHmac('sha256',Buffer.from(signer!,'hex')).update(payload).digest('hex');
    const {data,error}=await db.rpc(invite?'join_face_operation':'face_operation',{payload,signature});
    if(error)throw new Error(error.code==='P0001'?error.message:'Pendaftaran tidak tersedia. Hubungi pengurus.');
    return data;
  }
  try {
    const profile=await operation({action:invite?'check':'read'});
    if(!invite && (action==='enroll')===Boolean(profile.template))throw new Error('Periksa status pendaftaran wajah.');
    const vector=await runFaceModel(await readBytes(request.body,faceImageLimit));
    if(action==='enroll'){
      const template=sealFace(vector,key,aad);
      const result=await operation({action,version:profile?.version,template});
      return Response.json(invite?{time:new Date().toISOString()}:result);
    }
    const reference=openFace(profile.template,key,aad);
    const score=vector.reduce((sum,v,i)=>sum+v*reference.readFloatLE(4*i),0);
    if(score<0.5)throw new Error('Wajah belum cocok. Coba lagi atau hubungi pengurus.');
    return Response.json(await operation({action,version:profile.version,shift:headers.get('x-shift'),session:headers.get('x-location-session')}));
  } catch(error){
    if(error instanceof FaceModelBusy)return Response.json({error:error.message},{status:429});
    const message=error instanceof Error && /^[A-Z][^\n]{0,100}[.!]$/.test(error.message)?error.message:'Verifikasi gagal. Coba lagi atau hubungi pengurus.';
    return Response.json({error:message},{status:422});
  }
}
