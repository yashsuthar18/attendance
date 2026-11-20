import {requireEvent,apiError} from '../../../../lib/owner';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req){try{
  const q=new URL(req.url).searchParams;const {db,event}=await requireEvent(req,q.get('eventId'));
  const page=Math.max(1,Math.min(100000,Number(q.get('page'))||1));const size=50;
  const {data,error,count}=await db.from('event_members').select('id,first_name,father_name,surname,mobile,profile_confirmed,village,pincode,created_at',{count:'exact'}).eq('event_id',event.id).order('created_at',{ascending:true}).range((page-1)*size,page*size-1);
  if(error)throw error;return Response.json({members:data,count,page});
}catch(e){return apiError(e)}}
