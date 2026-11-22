import {createHmac,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {BodyTooLarge,FaceModelBusy,faceImageLimit,openFace,readBytes,runFaceModel,sealFace} from './face-model.ts';

const uuid=/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const hexKey=/^[\da-f]{64}$/i;

function failure(error:string,status:number){
  return Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
}
function result(data:{draft:string}|{submitted:true}){
  return Response.json(data,{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request:Request){
  const url=(process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publicKey=(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const signer=process.env.FACE_SIGNING_KEY;
  const templateKey=process.env.FACE_TEMPLATE_KEY;
  if(!url||!publicKey||!signer||!hexKey.test(signer)||!templateKey||!hexKey.test(templateKey))
    return failure('Pendaftaran belum tersedia. Coba lagi atau hubungi pengurus.',503);

  if(!request.body)return failure('Data pendaftaran belum lengkap.',400);
  const signingKey=Buffer.from(signer,'hex');
  const encryptionKey=Buffer.from(templateKey,'hex');
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  const db=createClient(url,publicKey,{auth:{persistSession:false},...(token?{global:{headers:{Authorization:'Bearer '+token}}}:{})});

  async function operation(fields:Record<string,unknown>){
    const payload=JSON.stringify({...fields,expires:Math.floor(Date.now()/1000)+60});
    const signature=createHmac('sha256',signingKey).update(payload).digest('hex');
    const {data,error}=await db.rpc('join_draft_operation',{payload,signature});
    if(error)throw new Error('Data pendaftaran belum dapat disimpan. Coba lagi.');
    return data as {status:string;rt?:string;template?:string|null};
  }

  const unavailable=()=>failure('Draf atau undangan sudah tidak tersedia. Buka kembali undangan atau minta tautan baru dari pengurus.',410);
  const contentType=request.headers.get('content-type')||'';

  try {
    if(contentType.startsWith('application/json')){
      if(!token)return failure('Konfirmasi email untuk melanjutkan.',401);
      const body=JSON.parse((await readBytes(request.body,1024)).toString('utf8'));
      const {code,draft}=body??{};
      if(typeof code!=='string'||!uuid.test(code)||typeof draft!=='string'||!uuid.test(draft))
        return failure('Tautan pendaftaran tidak valid.',400);
      const {data:{user}}=await db.auth.getUser(token);
      if(!user?.email_confirmed_at)return failure('Konfirmasi email untuk melanjutkan.',401);

      const fields={invite:code,draft,user:user.id};
      const saved=await operation({...fields,action:'read'});
      if(saved.status==='submitted')return result({submitted:true});
      if(saved.status==='unauthorized')return failure('Masuk dengan email yang dikonfirmasi untuk melanjutkan.',401);
      if(saved.status!=='ready'||!saved.rt)return unavailable();

      const template=saved.template
        ? sealFace(openFace(saved.template,encryptionKey,Buffer.from('join-draft/'+draft)),encryptionKey,Buffer.from(saved.rt+'/'+user.id))
        : null;
      const completed=await operation({...fields,action:'submit',template});
      if(completed.status==='submitted')return result({submitted:true});
      return unavailable();
    }

    if(!contentType.startsWith('multipart/form-data'))return failure('Format pendaftaran belum sesuai.',415);
    const bytes=await readBytes(request.body,faceImageLimit+8192);
    const form=await new Response(new Uint8Array(bytes),{headers:{'Content-Type':contentType}}).formData();
    const code=String(form.get('code')??'').toLowerCase();
    const name=String(form.get('name')??'').trim();
    const phone=String(form.get('phone')??'');
    const address=String(form.get('address')??'').trim();
    const email=String(form.get('email')??'').trim().toLowerCase();
    const photo=form.get('photo');
    if(!uuid.test(code))return unavailable();
    if(!name||name.length>120||!/^[1-9][0-9]{7,14}$/.test(phone)||!address||address.length>300
       ||email.length>254||!/^\S+@\S+\.\S+$/.test(email))
      return failure('Periksa kembali nama, nomor WhatsApp, alamat rumah, dan email.',400);
    if(photo!==null&&(typeof photo==='string'||photo.type!=='image/jpeg'||photo.size===0||
       photo.size>faceImageLimit||form.get('consent')!=='v1'))
      return failure('Rekam wajah dengan kamera dan setujui penggunaannya, atau daftar tanpa rekam wajah.',400);

    // Render appends the connecting address to the forwarding chain. Hash it before storage.
    const source=request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown';
    const ip=createHmac('sha256',signingKey).update('join-rate:'+source).digest('hex');
    const prepared=await operation({action:'prepare',invite:code,ip});
    if(prepared.status==='limited')return failure('Terlalu banyak percobaan. Coba lagi dalam 15 menit.',429);
    if(prepared.status!=='ready')return unavailable();

    const draft=randomUUID();
    let template:string|null=null;
    if(photo&&typeof photo!=='string'){
      try {
        const vector=await runFaceModel(Buffer.from(await photo.arrayBuffer()));
        template=sealFace(vector,encryptionKey,Buffer.from('join-draft/'+draft));
      } catch(error) {
        if(error instanceof FaceModelBusy)return failure(error.message,429);
        return failure('Wajah belum terbaca. Rekam ulang di tempat terang atau daftar tanpa rekam wajah.',422);
      }
    }

    const stored=await operation({action:'store',invite:code,draft,email,name,phone,address,template});
    if(stored.status!=='stored')return unavailable();
    return result({draft});
  } catch(error) {
    if(error instanceof BodyTooLarge)return failure(error.message,413);
    if(error instanceof SyntaxError||error instanceof TypeError)return failure('Data pendaftaran belum lengkap.',400);
    return failure('Pendaftaran belum dapat diproses. Coba lagi.',503);
  }
}
