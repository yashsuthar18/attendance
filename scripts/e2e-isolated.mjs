import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomBytes,randomInt,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url);
createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(root,false,{info(){},error(){}});
const base=process.env.E2E_BASE_URL||'http://localhost:3100';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw new Error('These tests are restricted to localhost.');
if(typeof WebSocket==='undefined')throw new Error('End-to-end tests require Node.js 22 or newer.');
await fetch(base,{signal:AbortSignal.timeout(5000)});
await fetch('http://127.0.0.1:9227/json/version',{signal:AbortSignal.timeout(5000)});
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const marker=randomUUID(),startedAt=new Date().toISOString();let userId,mobile,cleanupOK=false,exitCode=1;
try{
 for(let i=0;i<5;i++){mobile='9'+randomInt(100000000,1000000000);const existing=await db.from('organizers').select('id').eq('mobile',mobile).maybeSingle();if(existing.error)throw existing.error;if(!existing.data)break;mobile=null;}
 if(!mobile)throw new Error('Unable to reserve a unique QA mobile number');
 const password=randomBytes(24).toString('base64url');
 const created=await db.auth.admin.createUser({email:'qa-'+marker+'@example.com',password,email_confirm:true,user_metadata:{purpose:'local-e2e',run:marker}});
 if(created.error)throw created.error;userId=created.data.user.id;
 await fs.mkdir(path.join(root,'test-results'),{recursive:true});
 await fs.writeFile(path.join(root,'test-results','qa-organizer-'+marker+'.json'),JSON.stringify({organizerId:userId,run:marker}));
 const inserted=await db.from('organizers').insert({id:userId,mobile,password_hash:await bcrypt.hash(password,12),display_name:'QA automated organizer'});
 if(inserted.error)throw inserted.error;
 console.log('Created a temporary QA organizer; existing organizer credentials are not used.');
 exitCode=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(root,'scripts/e2e-local.mjs')],{cwd:root,env:{...process.env,E2E_BASE_URL:base,E2E_ORGANIZER_MOBILE:mobile,E2E_ORGANIZER_PASSWORD:password},stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',(code)=>resolve(code??1));});
}catch(error){console.error('QA organizer test setup failed: '+error.message);exitCode=1;}
finally{
 if(userId){try{if(mobile){const attempts=await db.from('organizer_login_attempts').delete().eq('mobile',mobile).gte('attempted_at',startedAt);if(attempts.error)throw attempts.error;}const deleted=await db.auth.admin.deleteUser(userId);if(deleted.error)throw deleted.error;const remaining=await db.from('organizers').select('id').eq('id',userId);if(remaining.error)throw remaining.error;if(remaining.data.length)throw new Error('QA organizer row still exists');const events=await db.from('events').select('id',{head:true,count:'exact'}).eq('organizer_id',userId);if(events.error)throw events.error;if(events.count)throw new Error('QA organizer events still exist');cleanupOK=true;console.log('PASS Temporary QA organizer and its owned data cleaned up');}catch(error){console.error('QA ORGANIZER CLEANUP FAILED: '+error.message);exitCode=1;}}
 await fs.mkdir(path.join(root,'test-results'),{recursive:true});
 await fs.writeFile(path.join(root,'test-results','qa-organizer-'+marker+'.json'),JSON.stringify({organizerId:userId,run:marker,cleanupOK,exitCode}));
 process.exitCode=exitCode;
}
