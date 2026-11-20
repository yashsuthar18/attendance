'use client';
import {useState} from 'react';
import {organizerFetch} from '../lib/browser';
const FIELDS=[['first_name','First Name / નામ'],['father_name','Father Name / પિતાનું નામ'],['surname','Surname / અટક'],['mobile','Mobile / મોબાઇલ'],['pincode','Pincode / પિનકોડ'],['village','Village / ગામ'],['taluka','Taluka / તાલુકો'],['district','District / જિલ્લો'],['address','Address / સરનામું']];
const standard=new Set(FIELDS.map(x=>x[0]));
const clean=s=>String(s??'').toLowerCase().replace(/\s+/g,' ').trim();
function guess(field){
 if(/mobile|phone|whatsapp|મોબાઇલ|મોબાઈલ|ફોન|contact|number/.test(field))return 'mobile';
 if(/father|પિતા|પિતાનું|પિતાનુ|વાલી/.test(field))return 'father_name';
 if(/surname|last name|અટક/.test(field))return 'surname';
 if(/first name|full name|નામ|name/.test(field))return 'first_name';
 if(/pin|પિન|zip/.test(field))return 'pincode';
 if(/village|ગામ/.test(field))return 'village';
 if(/taluka|તાલુકા|તાલુકો/.test(field))return 'taluka';
 if(/district|જિલ્લો/.test(field))return 'district';
 if(/address|સરનામું/.test(field))return 'address';
 return 'ignore';
}
function quoteCSV(v){const s=String(v??'');return `"${(/^[\s]*[=+@\-\t\r]/.test(s)?"'":"")+s.replace(/"/g,'""')}"`}
function downloadCredentials(creds,name){const data=['Member ID,Name,Mobile,Temporary Access Code',...creds.map(x=>[x.id,x.name,x.mobile,x.access_code].map(quoteCSV).join(','))].join('\r\n');const blob=new Blob(['\ufeff',data],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${name}-new-access-codes.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
export default function ImportSheet({event}){
 const [fileName,setFileName]=useState(''),[headers,setHeaders]=useState([]),[rows,setRows]=useState([]),[mapping,setMapping]=useState({}),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[message,setMessage]=useState(''),[error,setError]=useState(''),[creds,setCreds]=useState([]);
 async function openFile(e){
  const file=e.target.files?.[0];if(!file)return;setBusy(true);setError('');setMessage('');setCreds([]);setProgress(0);
  try{
   if(file.size>12*1024*1024)throw new Error('Maximum file size is 12 MB');
   const filename=file.name.toLowerCase();let sheet;
   if(filename.endsWith('.xlsx')){const read=(await import('read-excel-file/browser')).default;sheet=await read(file)}
   else if(filename.endsWith('.csv')){
     const Papa=(await import('papaparse')).default;sheet=await new Promise((resolve,reject)=>Papa.parse(file,{skipEmptyLines:true,complete:r=>r.errors.length?reject(new Error(r.errors[0].message)):resolve(r.data),error:reject}));
   }else throw new Error('Choose a .xlsx or .csv file (old .xls is not supported)');
   if(!sheet||sheet.length<2)throw new Error('No data rows found');
   const head=sheet[0].map(x=>String(x??'').trim());
   if(head.length>100)throw new Error('Maximum 100 columns');
   const records=sheet.slice(1).filter(r=>Array.isArray(r)&&r.some(x=>String(x??'').trim()));
   if(records.length>100000)throw new Error('Maximum 100,000 rows per import');
   const mapped={};const used=new Set();head.forEach((label,i)=>{let g=guess(clean(label));if(used.has(g)&&g!=='ignore')g='ignore';if(g!=='ignore')used.add(g);mapped[i]=g});
   setHeaders(head);setRows(records);setMapping(mapped);setFileName(file.name);
  }catch(err){setError(err.message);setHeaders([]);setRows([])}finally{setBusy(false)}
 }
 function updateMapping(index,value){setMapping(m=>({...m,[index]:value}));}
 async function start(){
  const used=Object.values(mapping).filter(x=>standard.has(x));
  if(!used.includes('first_name')||!used.includes('mobile')){setError('First Name અને Mobile બંને Column પસંદ કરો.');return}
  if(used.length!==new Set(used).size){setError('એક standard field માટે એક જ column પસંદ કરો.');return}
  setBusy(true);setError('');setMessage('');let result=[];
  try{
    const started=await organizerFetch('/api/organizer/import',{method:'POST',body:JSON.stringify({mode:'start',eventId:event.id,filename:fileName,headers,mapping,totalRows:rows.length})});
    let created=0,skipped=0;const problems=[];
    for(let i=0;i<rows.length;i+=150){
      const batch=await organizerFetch('/api/organizer/import',{method:'POST',body:JSON.stringify({mode:'batch',eventId:event.id,batchId:started.batchId,rows:rows.slice(i,i+150)})});
      created+=batch.created;skipped+=batch.skipped;result=[...result,...batch.credentials];problems.push(...batch.errors.slice(0,5));
      setCreds(result);setProgress(Math.min(rows.length,i+150));
    }
    setMessage(`${created} નવા સભ્યો ઉમેરાયા, ${skipped} rows skip થયા. ${problems.slice(0,3).join(' · ')} Temporary codes NOW download and save securely.`);
    if(result.length)downloadCredentials(result,event.slug);
  }catch(err){setError(`${err.message}. Partial import may have completed. If access codes are shown, download immediately. Existing mobile numbers will not be reissued on retry; use Organizer Reset Code.`)}finally{setBusy(false)}
 }
 return <div className="card"><h2>Excel / CSV → Member Import</h2><p className="muted">The first row must contain column headings. File is parsed in your browser; only selected columns are sent in batches of 150.</p><input type="file" accept=".xlsx,.csv" disabled={busy} onChange={openFile}/>
 {headers.length>0&&<>
  <div className="notice">{rows.length.toLocaleString()} rows found. Map <b>First Name</b> and <b>Mobile</b>. Select “Custom field” to save other useful columns.</div>
  <div className="table-wrap"><table><thead><tr><th>Sheet Column</th><th>Preview Row 1</th><th>Save As</th></tr></thead><tbody>{headers.map((h,i)=><tr key={i}><td>{h||`Column ${i+1}`}</td><td>{String(rows[0]?.[i]??'').slice(0,70)}</td><td><select value={mapping[i]??'ignore'} onChange={e=>updateMapping(i,e.target.value)}><option value="ignore">Ignore</option>{FIELDS.map(([key,label])=><option key={key} value={key}>{label}</option>)}<option value={`extra:${h||'Column '+(i+1)}`}>Custom field: {h||`Column ${i+1}`}</option></select></td></tr>)}</tbody></table></div>
  <p><b>Selected fields:</b> {Object.values(mapping).filter(v=>v!=='ignore').length}</p>
  <button onClick={start} disabled={busy}>{busy?'Import running…':'Start Import'}</button>
  {busy&&rows.length>0&&<p className="muted">Imported {progress.toLocaleString()} / {rows.length.toLocaleString()} rows</p>}
 </>}
 {error&&<div className="error">{error}</div>}{message&&<div className="msg">{message}</div>}
 {creds.length>0&&<div className="row"><button className="secondary" disabled={busy} onClick={()=>downloadCredentials(creds,event.slug)}>Download {creds.length} New Member Access Codes CSV</button><small>Codes cannot be retrieved later; only reset individually. Do not share the full file publicly.</small></div>}
 </div>;
}
