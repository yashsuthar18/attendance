import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {eventLocalDate} from '../lib/security.js';
import {testBrowser} from './e2e-browser.mjs';

const require=createRequire(import.meta.url);
createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const base=process.env.E2E_BASE_URL||'http://localhost:3100';
const parsed=new URL(base);
if(!['localhost','127.0.0.1','[::1]'].includes(parsed.hostname))throw new Error('These tests are restricted to localhost.');
const mobile=process.env.E2E_ORGANIZER_MOBILE,password=process.env.E2E_ORGANIZER_PASSWORD;
if(!mobile||!password)throw new Error('Set E2E_ORGANIZER_MOBILE and E2E_ORGANIZER_PASSWORD before running.');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const runId=randomUUID(), eventName='QA automated '+runId;
const out=path.resolve('test-results',runId);await fs.mkdir(out,{recursive:true});
const results=[];let event,organizerId,cleanupOK=false;
const org={},member={},anonymous={};
async function request(route,{method='GET',body,jar=anonymous}={}){
 const response=await fetch(base+route,{method,signal:AbortSignal.timeout(30000),headers:{...(body?{'content-type':'application/json'}:{}),...(jar.cookie?{cookie:jar.cookie}:{})},body:body?JSON.stringify(body):undefined});
 for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0];if(pair.startsWith('organizer_session=')||pair.startsWith('event_member_session='))jar.cookie=pair;}
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 return {status:response.status,data,headers:response.headers};
}
async function check(name,fn){const start=Date.now();try{await fn();results.push({name,status:'PASS',ms:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,status:'FAIL',error:error.message,ms:Date.now()-start});throw error;}}
const post=(route,body,jar=org)=>request(route,{method:'POST',body,jar});
const ok=r=>{assert.equal(r.status,200,typeof r.data==='object'?r.data.error:'Request failed');return r.data;};
try{
 await check('Public pages and local fonts load',async()=>{for(const route of ['/','/organizer/login','/my-card','/join/test-slug','/scan','/fonts/noto-sans-gujarati-0.woff2'])assert.equal((await request(route)).status,200);});
 await check('Unauthenticated APIs reject access',async()=>{for(const route of ['/api/organizer/me','/api/organizer/events','/api/member/me'])assert.ok([401,403].includes((await request(route)).status));});
 await check('Password setup is disabled without setup key',async()=>assert.equal((await post('/api/organizer/setup-password',{mobile,password:'unused-test-password'},anonymous)).status,403));
 await check('Organizer mobile/password login and secure cookie',async()=>{const login=await post('/api/organizer/login',{mobile,password},org);ok(login);const flags=login.headers.getSetCookie().join(';');assert.ok(/;\s*Secure/i.test(flags),'Organizer cookie must be Secure');assert.ok(/;\s*HttpOnly/i.test(flags),'Organizer cookie must be HttpOnly');assert.ok(/SameSite=lax/i.test(flags),'Organizer cookie must use SameSite=Lax');assert.ok(org.cookie?.startsWith('organizer_session='));const me=ok(await request('/api/organizer/me',{jar:org}));organizerId=me.organizerId;assert.ok(organizerId);});
 await check('Invalid organizer session is rejected',async()=>assert.equal((await request('/api/organizer/me',{jar:{cookie:'organizer_session=invalid'}})).status,401));
 await check('Create isolated event with three meeting slots',async()=>{event=ok(await post('/api/organizer/events',{name:eventName})).event;await fs.writeFile(path.join(out,'fixture.json'),JSON.stringify({eventId:event.id,eventName,organizerId}));const meetings=ok(await request('/api/organizer/meetings?eventId='+event.id,{jar:org})).meetings;assert.equal(meetings.length,3);});
 await check('Event listing contains the new test event',async()=>assert.ok(ok(await request('/api/organizer/events',{jar:org})).events.some(e=>e.id===event.id)));
 await check('Unknown event cannot be read or exported',async()=>{for(const route of ['/api/organizer/members?eventId=','/api/organizer/export?eventId='])assert.equal((await request(route+randomUUID(),{jar:org})).status,403);});
 const headers=['First Name','Mobile','Surname','PIN','Ticket Type'],mapping={0:'first_name',1:'mobile',2:'surname',3:'pincode',4:'extra:Ticket Type'};
 let batchId;
 await check('Import mapping requires mobile and first name',async()=>assert.equal((await post('/api/organizer/import',{mode:'start',eventId:event.id,headers,mapping:{0:'first_name'},totalRows:2,filename:'qa.csv'})).status,400));
 await check('Import batch starts with custom field mapping',async()=>{batchId=ok(await post('/api/organizer/import',{mode:'start',eventId:event.id,headers,mapping,totalRows:56,filename:'qa.csv'})).batchId;assert.ok(batchId);});
 const rowA=['QA Alpha','9000000012','Tester','384315','=SUM(1,2)'],rowB=['QA Beta','9000003210','Tester','384315','Standard'];let memberA;
 await check('Import valid rows, skip duplicate, invalid mobile and PIN',async()=>{const data=ok(await post('/api/organizer/import',{mode:'batch',eventId:event.id,batchId,rows:[rowA,rowB,rowA,['Bad','123','Tester','384315',''],['Bad PIN','9000001111','Tester','123','']]}));assert.equal(data.created,2);assert.equal(data.skipped,3);assert.equal(data.errors.length,2);assert.equal(data.credentials.find(c=>c.mobile===rowA[1]).access_code,'001209');assert.equal(data.credentials.find(c=>c.mobile===rowB[1]).access_code,'321009');memberA=data.credentials.find(c=>c.mobile===rowA[1]).id;});
 await check('Reimport skips existing members',async()=>{const data=ok(await post('/api/organizer/import',{mode:'batch',eventId:event.id,batchId,rows:[rowA,rowB]}));assert.equal(data.created,0);assert.equal(data.skipped,2);});
 await check('Import rejects more than 150 rows per batch',async()=>assert.equal((await post('/api/organizer/import',{mode:'batch',eventId:event.id,batchId,rows:Array(151).fill(rowA)})).status,400));
 await check('Members pagination handles more than 50 records',async()=>{const rows=Array.from({length:49},(_,i)=>['QA Pagination '+i,String(9001000000+i),'Tester','384315','Standard']);assert.equal(ok(await post('/api/organizer/import',{mode:'batch',eventId:event.id,batchId,rows})).created,49);const page1=ok(await request('/api/organizer/members?eventId='+event.id+'&page=1',{jar:org}));const page2=ok(await request('/api/organizer/members?eventId='+event.id+'&page=2',{jar:org}));assert.equal(page1.count,51);assert.equal(page1.members.length,50);assert.equal(page2.members.length,1);});
 await check('Wrong participant password is rejected',async()=>assert.equal((await post('/api/member/login',{slug:event.slug,mobile:rowA[1],accessCode:'001208'},{})).status,401));
 await check('Participant login accepts leading-zero password',async()=>ok(await post('/api/member/login',{slug:event.slug,mobile:rowA[1],accessCode:'001209'},member)));
 await check('Unconfirmed member has no QR or password hash exposed',async()=>{const data=ok(await request('/api/member/me',{jar:member}));assert.equal(data.member.qr_token,null);assert.equal(data.member.profile_confirmed,false);assert.ok(!('access_hash' in data.member));assert.ok(!('session_version' in data.member));});
 const profile={first_name:'QA Alpha Updated',surname:'Tester',father_name:'QA',pincode:'384315',village:'Visnagar',taluka:'Visnagar',district:'Mehsana',address:'QA test only',extra_data:{'Ticket Type':'=SUM(1,2)',injected:'not allowed'}};
 await check('Profile validation rejects missing name and invalid PIN',async()=>{assert.equal((await post('/api/member/profile',{...profile,surname:''},member)).status,400);assert.equal((await post('/api/member/profile',{...profile,pincode:'123'},member)).status,400);});
 let meetings=ok(await request('/api/organizer/meetings?eventId='+event.id,{jar:org})).meetings;
 const meetingBody=(n,extra={})=>({eventId:event.id,meeting_number:n,title:'QA Meeting '+n,meeting_date:eventLocalDate(),is_open:true,is_completed:false,...extra});
 await check('Meeting form rejects open and completed together',async()=>assert.equal((await post('/api/organizer/meetings',meetingBody(1,{is_completed:true}))).status,400));
 await check('Meeting date and scanning state can be saved',async()=>{meetings[0]=ok(await post('/api/organizer/meetings',meetingBody(1))).meeting;});
 await check('Invalid QR values are rejected',async()=>assert.equal((await post('/api/organizer/scan',{eventId:event.id,meetingId:meetings[0].id,qrValue:'invalid'})).status,400));
 await check('Confirm profile once and expose random QR token',async()=>{const data=ok(await post('/api/member/profile',profile,member));assert.equal(data.member.profile_confirmed,true);assert.match(data.member.qr_token,/^[A-Za-z0-9_-]{32}$/);assert.equal(data.member.extra_data.injected,undefined);});
 await check('Confirmed profile cannot be edited again',async()=>assert.equal((await post('/api/member/profile',profile,member)).status,409));
 const qrValue='EVENTQR:'+ok(await request('/api/member/me',{jar:member})).member.qr_token;
 await check('Scan attendance then reject duplicate attendance',async()=>{assert.equal(ok(await post('/api/organizer/scan',{eventId:event.id,meetingId:meetings[0].id,qrValue})).status,'present');assert.equal(ok(await post('/api/organizer/scan',{eventId:event.id,meetingId:meetings[0].id,qrValue})).status,'duplicate');});
 await check('Wrong-date, closed and completed meetings reject scans',async()=>{await post('/api/organizer/meetings',meetingBody(2,{meeting_date:'2000-01-01'}));assert.equal((await post('/api/organizer/scan',{eventId:event.id,meetingId:meetings[1].id,qrValue})).status,400);await post('/api/organizer/meetings',meetingBody(2,{is_open:false}));assert.equal((await post('/api/organizer/scan',{eventId:event.id,meetingId:meetings[1].id,qrValue})).status,400);ok(await post('/api/organizer/meetings',meetingBody(2,{is_open:false,is_completed:true})));assert.equal((await post('/api/organizer/scan',{eventId:event.id,meetingId:meetings[1].id,qrValue})).status,400);});
 await check('CSV export includes statuses, custom fields and formula escaping',async()=>{const r=await request('/api/organizer/export?eventId='+event.id,{jar:org});assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/csv/);assert.match(r.headers.get('content-disposition'),/attachment/);for(const text of ['Present','Absent','Pending','Ticket Type',"'=SUM(1,2)",'QA Alpha Updated'])assert.ok(r.data.includes(text),'Missing expected export value');assert.equal(r.data.split('\r\n').length,52);});
 await check('Reset password preserves convention and revokes old session',async()=>{assert.equal(ok(await post('/api/organizer/reset-code',{eventId:event.id,memberId:memberA})).access_code,'001209');assert.equal((await request('/api/member/me',{jar:member})).status,401);ok(await post('/api/member/login',{slug:event.slug,mobile:rowA[1],accessCode:'001209'},member));});
 await check('Participant rate limiter blocks repeated wrong passwords',async()=>{const jar={};let last;for(let n=0;n<9;n++)last=await post('/api/member/login',{slug:event.slug,mobile:'9001000048',accessCode:'999999'},jar);assert.equal(last.status,429);});
 await testBrowser({base,event,orgCookie:org.cookie,memberCookie:member.cookie,out,check,rowA,rowB,assert});
 await check('Participant logout clears browser session',async()=>{ok(await post('/api/member/logout',{},member));assert.equal((await request('/api/member/me',{jar:member})).status,401);});
 await check('Organizer logout clears browser session',async()=>{ok(await post('/api/organizer/logout',{},org));assert.equal((await request('/api/organizer/me',{jar:org})).status,401);});
}catch(error){console.error('Test stopped: '+error.message);process.exitCode=1;}
finally{
 if(event&&organizerId){try{const {error}=await db.from('events').delete().eq('id',event.id).eq('organizer_id',organizerId).eq('name',eventName);if(error)throw error;const remaining=await db.from('events').select('id').eq('id',event.id);if(remaining.error)throw remaining.error;assert.equal(remaining.data.length,0);for(const table of ['event_members','meetings','attendance','import_batches','member_login_attempts']){const r=await db.from(table).select('id',{head:true,count:'exact'}).eq('event_id',event.id);if(r.error)throw r.error;assert.equal(r.count,0);}cleanupOK=true;console.log('PASS Isolated test event and dependent records cleaned up');}catch(error){console.error('CLEANUP FAILED: '+error.message);process.exitCode=1;}}
 const report={testedAt:new Date().toISOString(),base,results,cleanupOK,limitations:['Headless Chrome does not verify a physical phone camera or printed QR scan.','Production hosting and public HTTPS deployment were not tested.']};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 const markdown=['# Local production-build test report','',`Tested: ${report.testedAt}`,`Base URL: ${base}`,'',...results.map(r=>`- ${r.status}: ${r.name}${r.error?' - '+r.error:''}`),'',`Test data cleanup: ${cleanupOK?'PASS':'NOT COMPLETED'}`,'','Limitations:',...report.limitations.map(x=>'- '+x),''].join('\n');
 await fs.writeFile(path.join(out,'report.md'),markdown);console.log('REPORT '+path.join(out,'report.md'));
}
