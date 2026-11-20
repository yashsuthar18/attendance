import {requireEvent,apiError} from '../../../../lib/owner';
import {FIELD_NAMES,isAllowedMapping,mobileNumber,generateCode,hashAccess,qrToken,shortText} from '../../../../lib/security';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req){try{
  const body=await req.json();
  const {db,event}=await requireEvent(req,body.eventId);
  if(body.mode==='start'){
    const headers=body.headers,mapping=body.mapping;
    if(!Array.isArray(headers)||headers.length<2||headers.length>100||headers.some(x=>typeof x!=='string'))throw new Error('Invalid header row');
    if(!mapping||typeof mapping!=='object'||Array.isArray(mapping))throw new Error('Select columns');
    const mapped=Object.entries(mapping).filter(([key,v])=>v!=='ignore');
    if(mapped.length===0||mapped.some(([k,v])=>!/^\d+$/.test(k)||+k>=headers.length||!isAllowedMapping(v)))throw new Error('Invalid column mapping');
    const fields=mapped.map(([,v])=>v).filter(v=>!v.startsWith('extra:'));
    if(!fields.includes('mobile')||!fields.includes('first_name'))throw new Error('Map both Mobile and First Name');
    if(new Set(fields).size!==fields.length)throw new Error('Map every standard field only once');
    const total=Number(body.totalRows);
    if(!Number.isInteger(total)||total<1||total>100000)throw new Error('Invalid row count');
    const {data:batch,error}=await db.from('import_batches').insert({event_id:event.id,filename:shortText(body.filename,200),headers,mapping,total_rows:total}).select('id').single();
    if(error)throw error;return Response.json({batchId:batch.id});
  }
  if(body.mode==='batch'){
    if(!body.batchId||!Array.isArray(body.rows)||body.rows.length<1||body.rows.length>150)throw new Error('Send 1–150 rows at a time');
    const {data:batch,error:bErr}=await db.from('import_batches').select('*').eq('id',body.batchId).eq('event_id',event.id).maybeSingle();
    if(bErr||!batch)throw new Error('Import batch not found');
    const mapped=Object.entries(batch.mapping).filter(([,v])=>v!=='ignore');
    const records=[];const errors=[];const seen=new Set();let skipped=0;
    for(let i=0;i<body.rows.length;i++){
      const row=body.rows[i];
      if(!Array.isArray(row)||row.length>100){errors.push(`Row ${i+1}: invalid data`);skipped++;continue}
      const m={event_id:event.id,extra_data:{}};
      for(const [col,target] of mapped){
        const value=shortText(row[Number(col)],target==='address'?500:150);
        if(target.startsWith('extra:')){m.extra_data[target.slice(6)]=value}else if(FIELD_NAMES.includes(target)){m[target]=value}
      }
      m.mobile=mobileNumber(m.mobile);
      if(!m.mobile||!m.first_name){skipped++;errors.push(`Row ${i+1}: missing/invalid mobile or name`);continue}
      if(m.pincode&&!/^\d{6}$/.test(m.pincode)){skipped++;errors.push(`Row ${i+1}: invalid 6-digit PIN`);continue}
      if(seen.has(m.mobile)){skipped++;continue}
      seen.add(m.mobile);records.push(m);
    }
    const mobileList=records.map(x=>x.mobile);
    const {data:existing,error:xErr}=mobileList.length?await db.from('event_members').select('mobile').eq('event_id',event.id).in('mobile',mobileList):{data:[],error:null};
    if(xErr)throw xErr;
    const existingSet=new Set((existing||[]).map(x=>x.mobile));
    const fresh=records.filter(x=>!existingSet.has(x.mobile));
    const coded=fresh.map(x=>{const code=generateCode();return {...x,access_hash:hashAccess(code),qr_token:qrToken(),_code:code}});
    let inserted=[];
    if(coded.length){
      const payload=coded.map(({_code,...rest})=>rest);
      const {data,error}=await db.from('event_members').upsert(payload,{onConflict:'event_id,mobile',ignoreDuplicates:true}).select('id,mobile');
      if(error)throw error;
      inserted=data||[];
    }
    const imported=new Map(inserted.map(x=>[x.mobile,x.id]));
    const credentials=coded.filter(x=>imported.has(x.mobile)).map(x=>({id:imported.get(x.mobile),mobile:x.mobile,name:[x.first_name,x.father_name,x.surname].filter(Boolean).join(' '),access_code:x._code}));
    skipped+=(records.length-credentials.length);
    const {error:uErr}=await db.from('import_batches').update({processed_rows:batch.processed_rows+body.rows.length,created_rows:batch.created_rows+credentials.length,skipped_rows:batch.skipped_rows+skipped}).eq('id',batch.id).eq('event_id',event.id);
    if(uErr)throw uErr;
    return Response.json({created:credentials.length,skipped,credentials,errors:errors.slice(0,25)});
  }
  throw new Error('Invalid import mode');
}catch(e){return apiError(e)}}
