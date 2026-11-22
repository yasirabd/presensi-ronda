import {createCipheriv, createDecipheriv, createHmac, randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const draftKey='ronda_join_draft';
const maxBodyBytes=4096;
const lifetime=2*24*60*60*1000;
const uuidPattern=/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export async function POST(request:Request) {
  const secret=process.env.FACE_TEMPLATE_KEY;
  if(!secret || !/^[\da-f]{64}$/i.test(secret))return Response.json({error:'Pendaftaran belum tersedia.'},{status:503});
  const key=createHmac('sha256',Buffer.from(secret,'hex')).update('ronda-pak:join-draft:v1').digest();

  try {
    const reader=request.body?.getReader();
    if(!reader)return Response.json({error:'Data pendaftaran belum lengkap.'},{status:400});
    const chunks:Uint8Array[]=[];
    let size=0;
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      size+=value.length;
      if(size>maxBodyBytes){
        await reader.cancel();
        return Response.json({error:'Data pendaftaran terlalu panjang.'},{status:413});
      }
      chunks.push(value);
    }
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const code=typeof body.code==='string'?body.code.toLowerCase():'';
    if(!uuidPattern.test(code))return Response.json({error:'Tautan undangan tidak valid.'},{status:400});

    const auth=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if(auth){
      const url=(process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
      const publishable=(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
      if(!url || !publishable)return Response.json({error:'Pendaftaran belum tersedia.'},{status:503});
      const db=createClient(url,publishable,{global:{headers:{Authorization:'Bearer '+auth}},auth:{persistSession:false}});
      const {data:{user}}=await db.auth.getUser(auth);
      if(!user?.email_confirmed_at || !user.email)return Response.json({error:'Konfirmasi email untuk melanjutkan.'},{status:401});
      const sealed=user.user_metadata[draftKey];
      if(typeof sealed!=='string' || sealed.length>4000)return Response.json({error:'Data pendaftaran tidak tersedia.'},{status:404});
      const packed=Buffer.from(sealed,'base64url');
      if(packed.length<=28)return Response.json({error:'Data pendaftaran tidak tersedia.'},{status:404});
      let draft;
      try {
        const decipher=createDecipheriv('aes-256-gcm',key,packed.subarray(0,12));
        decipher.setAAD(Buffer.from(code+':'+user.email.trim().toLowerCase()));
        decipher.setAuthTag(packed.subarray(12,28));
        draft=JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)),decipher.final()]).toString('utf8'));
      } catch {
        return Response.json({error:'Data pendaftaran tidak tersedia untuk undangan ini.'},{status:404});
      }
      if(!Number.isFinite(draft.expires) || draft.expires<Date.now())return Response.json({error:'Data pendaftaran kedaluwarsa.'},{status:410});
      const {error}=await db.rpc('save_join_request',{code,full_name:draft.name,phone:draft.phone,address:draft.address});
      if(error)return Response.json({error:'Data pendaftaran belum dapat dipulihkan. Coba lagi.'},{status:409});
      return Response.json({restored:true});
    }

    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    const name=typeof body.name==='string'?body.name.trim():'';
    const phone=typeof body.phone==='string'?body.phone:'';
    const address=typeof body.address==='string'?body.address.trim():'';
    if(!email.includes('@') || email.length>254 || !name || name.length>120 ||
       !/^[1-9][0-9]{7,14}$/.test(phone) || !address || address.length>300)
      return Response.json({error:'Lengkapi nama, nomor WhatsApp, dan alamat rumah.'},{status:400});
    const iv=randomBytes(12);
    const cipher=createCipheriv('aes-256-gcm',key,iv);
    cipher.setAAD(Buffer.from(code+':'+email));
    const ciphertext=Buffer.concat([
      cipher.update(JSON.stringify({name,phone,address,expires:Date.now()+lifetime}),'utf8'),
      cipher.final()
    ]);
    return Response.json({draft:Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64url')});
  } catch {
    return Response.json({error:'Pendaftaran belum dapat diproses. Coba lagi.'},{status:400});
  }
}
