import {requireMember,publicMember} from '../../../../lib/member-auth';
import {adminDb} from '../../../../lib/db';
import {shortText} from '../../../../lib/security';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req){try{
  const member=await requireMember();
  if(member.profile_confirmed)return Response.json({error:'Profile already confirmed. Ask organizer for corrections.'},{status:409});
  const body=await req.json();
  const fields=['first_name','father_name','surname','pincode','village','taluka','district','address'];
  const update={};for(const field of fields)update[field]=shortText(body[field],field==='address'?500:150);
  if(!update.first_name||!update.surname)return Response.json({error:'First name and surname are required'},{status:400});
  if(update.pincode&&!/^\d{6}$/.test(update.pincode))return Response.json({error:'PIN code must be 6 digits'},{status:400});
  const incoming=body.extra_data;
  const extra={...member.extra_data};
  if(incoming&&typeof incoming==='object'&&!Array.isArray(incoming)){
    for(const key of Object.keys(extra)) if(Object.prototype.hasOwnProperty.call(incoming,key)) extra[key]=shortText(incoming[key],150);
  }
  const {data,error}=await adminDb().from('event_members').update({...update,extra_data:extra,profile_confirmed:true,confirmed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',member.id).eq('event_id',member.event_id).eq('profile_confirmed',false).select('*').maybeSingle();
  if(error)throw error;
  if(!data)return Response.json({error:'Profile already confirmed'},{status:409});
  return Response.json({member:publicMember(data)},{headers:{'Cache-Control':'private,no-store'}});
}catch{return Response.json({error:'Member session invalid or update failed'},{status:401})}}
