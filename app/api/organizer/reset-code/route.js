import {requireEvent,apiError} from '../../../../lib/owner';
import {generateCode,hashAccess} from '../../../../lib/security';
export const runtime='nodejs';
export async function POST(req){try{
  const {eventId,memberId}=await req.json();const {db,event}=await requireEvent(req,eventId);
  const code=generateCode();
  const {data:old,error:lookupError}=await db.from('event_members').select('session_version').eq('id',memberId).eq('event_id',event.id).maybeSingle();
  if(lookupError||!old)throw new Error('Member not found');
  const {error}=await db.from('event_members').update({access_hash:hashAccess(code),session_version:old.session_version+1,updated_at:new Date().toISOString()}).eq('id',memberId).eq('event_id',event.id);
  if(error)throw error;
  return Response.json({access_code:code});
}catch(e){return apiError(e)}}
