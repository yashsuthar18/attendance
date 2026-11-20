import {requireEvent,apiError} from '../../../../lib/owner';
import {eventLocalDate} from '../../../../lib/security';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req){try{
  const body=await req.json();const {db,event,organizerId}=await requireEvent(req,body.eventId);
  const {data:meeting}=await db.from('meetings').select('id,event_id,meeting_number,meeting_date,is_open,is_completed,title').eq('event_id',event.id).eq('id',body.meetingId).maybeSingle();
  if(!meeting)throw new Error('Meeting not found');
  if(meeting.is_completed)throw new Error('This meeting is completed');
  if(!meeting.is_open)throw new Error('Open this meeting in Organizer before scanning');
  if(!meeting.meeting_date||meeting.meeting_date!==eventLocalDate(event.timezone))throw new Error('QR attendance is allowed only on the selected meeting date (India time)');
  const raw=String(body.qrValue||'');
  const token=raw.startsWith('EVENTQR:')?raw.slice(8):'';
  if(!/^[A-Za-z0-9_-]{32}$/.test(token))throw new Error('Not a valid Event QR card');
  const {data:member}=await db.from('event_members').select('id,first_name,father_name,surname,mobile,profile_confirmed,is_active').eq('event_id',event.id).eq('qr_token',token).maybeSingle();
  if(!member||!member.is_active||!member.profile_confirmed)throw new Error('Member not found or profile not confirmed');
  const {error}=await db.from('attendance').insert({event_id:event.id,meeting_id:meeting.id,member_id:member.id,scanned_by:organizerId});
  if(error?.code==='23505')return Response.json({status:'duplicate',message:'Already present in this meeting',member});
  if(error)throw error;
  return Response.json({status:'present',message:'Attendance recorded',member});
}catch(e){return apiError(e)}}
