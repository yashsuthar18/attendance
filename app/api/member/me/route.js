import {requireMember,publicMember} from '../../../../lib/member-auth';
import {adminDb} from '../../../../lib/db';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){try{
  const m=await requireMember();
  const {data:e}=await adminDb().from('events').select('id,name,slug').eq('id',m.event_id).single();
  return Response.json({member:publicMember(m),event:e},{headers:{'Cache-Control':'private,no-store'}});
}catch{return Response.json({error:'Please log in as participant'},{status:401,headers:{'Cache-Control':'no-store'}})}}
