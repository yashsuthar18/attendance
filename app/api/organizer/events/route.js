import {randomBytes} from 'node:crypto';
import {requireOrganizer,apiError} from '../../../../lib/owner';
import {shortText} from '../../../../lib/security';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req){try{
  const {db,organizerId}=await requireOrganizer(req);
  const {data,error}=await db.from('events').select('id,name,slug,timezone,created_at').eq('organizer_id',organizerId).order('created_at',{ascending:false});
  if(error)throw error;return Response.json({events:data},{headers:{'Cache-Control':'no-store'}});
}catch(e){return apiError(e)}}
export async function POST(req){try{
  const {db,organizerId}=await requireOrganizer(req);
  const body=await req.json();const name=shortText(body.name,120);
  if(name.length<2)throw new Error('Event name must have at least 2 characters');
  const slug=shortText(name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40),45).replace(/-$/,'')||'event';
  const uniqueSlug=`${slug}-${randomBytes(4).toString('hex')}`;
  const {data:event,error}=await db.from('events').insert({name,slug:uniqueSlug,organizer_id:organizerId}).select().single();
  if(error)throw error;
  const {error:meetErr}=await db.from('meetings').insert([1,2,3].map(i=>({event_id:event.id,meeting_number:i,title:`Meeting ${i}`})));
  if(meetErr){await db.from('events').delete().eq('id',event.id);throw meetErr}
  return Response.json({event});
}catch(e){return apiError(e)}}
