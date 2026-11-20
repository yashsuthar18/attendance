import {requireEvent,apiError} from '../../../../lib/owner';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req){try{
  const eventId=new URL(req.url).searchParams.get('eventId');const {db,event}=await requireEvent(req,eventId);
  const {data,error}=await db.from('meetings').select('*').eq('event_id',event.id).order('meeting_number');
  if(error)throw error;return Response.json({meetings:data});
}catch(e){return apiError(e)}}
export async function POST(req){try{
  const body=await req.json();const {db,event}=await requireEvent(req,body.eventId);
  const n=Number(body.meeting_number);
  if(!Number.isInteger(n)||n<1||n>3)throw new Error('Invalid meeting');
  const meeting_date=body.meeting_date||null;
  if(meeting_date&&!/^\d{4}-\d{2}-\d{2}$/.test(meeting_date))throw new Error('Invalid date');
  const title=String(body.title||`Meeting ${n}`).trim().slice(0,80);
  if(!title)throw new Error('Title required');
  if(body.is_open&&body.is_completed)throw new Error('A completed meeting cannot also be open for scanning');
  const {data,error}=await db.from('meetings').update({title,meeting_date,is_open:Boolean(body.is_open),is_completed:Boolean(body.is_completed)}).eq('event_id',event.id).eq('meeting_number',n).select().single();
  if(error)throw error;return Response.json({meeting:data});
}catch(e){return apiError(e)}}
