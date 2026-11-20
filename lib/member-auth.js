import {SignJWT,jwtVerify} from 'jose';
import {cookies} from 'next/headers';
import {adminDb} from './db';
import {secret} from './security';
const COOKIE='event_member_session';
const key=()=>new TextEncoder().encode(secret('MEMBER_SESSION_SECRET'));
export async function setMemberSession(member){
  const token=await new SignJWT({eventId:member.event_id,sessionVersion:member.session_version,role:'member'})
    .setProtectedHeader({alg:'HS256'}).setSubject(member.id).setIssuedAt().setExpirationTime('7d').sign(key());
  (await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:7*24*60*60});
}
export async function clearMemberSession(){(await cookies()).delete(COOKIE)}
export async function requireMember(){
  const token=(await cookies()).get(COOKIE)?.value;
  if(!token) throw new Error('Member login required');
  let payload;try{({payload}=await jwtVerify(token,key(),{algorithms:['HS256']}))}catch{throw new Error('Member session expired')}
  if(payload.role!=='member'||!payload.sub||!payload.eventId)throw new Error('Invalid session');
  const {data:member,error}=await adminDb().from('event_members').select('*').eq('id',payload.sub).eq('event_id',payload.eventId).eq('is_active',true).maybeSingle();
  if(error||!member||member.session_version!==payload.sessionVersion)throw new Error('Invalid or revoked member session');
  return member;
}
export function publicMember(m){return {
  id:m.id,event_id:m.event_id,mobile:m.mobile,first_name:m.first_name,father_name:m.father_name,surname:m.surname,
  pincode:m.pincode,village:m.village,taluka:m.taluka,district:m.district,address:m.address,extra_data:m.extra_data,
  profile_confirmed:m.profile_confirmed,qr_token:m.profile_confirmed?m.qr_token:null
}}
