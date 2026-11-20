import {adminDb} from '../../../../lib/db';
import {hashIp,matchesAccess,mobileNumber,shortText} from '../../../../lib/security';
import {setMemberSession} from '../../../../lib/member-auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req){
  const fail=()=>Response.json({error:'Invalid mobile, access code or event'},{status:401,headers:{'Cache-Control':'no-store'}});
  try{
    const {slug,mobile,accessCode}=await req.json();
    const number=mobileNumber(mobile);
    if(!number||typeof accessCode!=='string'||accessCode.length>100||accessCode.length<8||typeof slug!=='string'||slug.length>100)return fail();
    const db=adminDb();
    const {data:event}=await db.from('events').select('id').eq('slug',slug).eq('is_published',true).maybeSingle();
    if(!event)return fail();
    // Trust the platform-provided first IP header. For additional anti-abuse use a WAF/CAPTCHA.
    const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,100);
    const {data:allowed,error:limErr}=await db.rpc('reserve_member_login_attempt',{p_event_id:event.id,p_mobile:number,p_ip_hash:hashIp(ip)});
    if(limErr)throw limErr;
    if(!allowed)return Response.json({error:'Too many attempts. Try again after 15 minutes.'},{status:429});
    const {data:member}=await db.from('event_members').select('id,event_id,mobile,access_hash,session_version,is_active,profile_confirmed').eq('event_id',event.id).eq('mobile',number).maybeSingle();
    if(!member||!member.is_active||!matchesAccess(accessCode,member.access_hash))return fail();
    await setMemberSession(member);
    return Response.json({ok:true,profile_confirmed:member.profile_confirmed},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return Response.json({error:'Login temporarily unavailable'},{status:500,headers:{'Cache-Control':'no-store'}})}
}
