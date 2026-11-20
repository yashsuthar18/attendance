import {adminDb} from './db';
export async function requireOrganizer(req){
  const token=req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token) throw new Error('Not logged in as organizer');
  const db=adminDb();
  const {data:{user},error}=await db.auth.getUser(token);
  if(error || !user) throw new Error('Invalid organizer login');
  const {data:organizer}=await db.from('organizers').select('id').eq('id',user.id).maybeSingle();
  if(!organizer) throw new Error('Organizer access not enabled');
  return {db,organizerId:user.id};
}
export async function requireEvent(req,eventId){
  const ctx=await requireOrganizer(req);
  if(!eventId || typeof eventId!=='string') throw new Error('Missing event ID');
  const {data:event,error}=await ctx.db.from('events').select('*').eq('id',eventId).eq('organizer_id',ctx.organizerId).maybeSingle();
  if(error || !event) throw new Error('Event not found or no permission');
  return {...ctx,event};
}
export function apiError(error){
  const message=String(error?.message || error || 'Unexpected error');
  const status=/login|permission|access not enabled|not found/i.test(message)?403:400;
  return Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
}
