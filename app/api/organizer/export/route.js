import {requireEvent,apiError} from '../../../../lib/owner';
import {csv} from '../../../../lib/security';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function allRows(db,table,columns,eventId,order='id'){
  const out=[];
  for(let offset=0;offset<100000;offset+=1000){
    const {data,error}=await db.from(table).select(columns).eq('event_id',eventId).order(order,{ascending:true}).range(offset,offset+999);
    if(error)throw error;
    out.push(...data);if(data.length<1000)break;
  }
  return out;
}
export async function GET(req){try{
  const {searchParams}=new URL(req.url);const {db,event}=await requireEvent(req,searchParams.get('eventId'));
  const [members,meetings,attendance]=await Promise.all([
    allRows(db,'event_members','id,mobile,first_name,father_name,surname,pincode,village,taluka,district,address,extra_data,profile_confirmed',''+event.id,'created_at'),
    allRows(db,'meetings','id,meeting_number,title,meeting_date,is_completed',event.id,'meeting_number'),
    allRows(db,'attendance','member_id,meeting_id,scanned_at',event.id,'scanned_at')
  ]);
  const customFields=[...new Set(members.flatMap(m=>Object.keys(m.extra_data||{})))].sort();
  const heads=['Member ID','Name','Father Name','Surname','Mobile','PIN','Village','Taluka','District','Address','Profile Confirmed',...customFields,...meetings.flatMap(m=>[`Meeting ${m.meeting_number} Status`,`Meeting ${m.meeting_number} Scan Time`]),'Total Present'];
  const meetingMap=new Map(meetings.map(m=>[m.id,m]));
  const attended=new Map();
  for(const row of attendance){
    const m=meetingMap.get(row.meeting_id);if(m)attended.set(`${row.member_id}/${m.meeting_number}`,row.scanned_at);
  }
  const rows=members.map(m=>{
    let count=0;
    const status=meetings.flatMap(meeting=>{
      const when=attended.get(`${m.id}/${meeting.meeting_number}`);
      if(when)count++;
      return [when?'Present':meeting.is_completed?'Absent':'Pending',when||''];
    });
    return [m.id,m.first_name,m.father_name,m.surname,m.mobile,m.pincode,m.village,m.taluka,m.district,m.address,m.profile_confirmed?'Yes':'No',...customFields.map(f=>m.extra_data?.[f]||''),...status,count];
  });
  const content=csv([heads,...rows]);
  return new Response(content,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${event.slug}-attendance.csv"`,'Cache-Control':'private,no-store'}});
}catch(e){return apiError(e)}}
