'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {browserSupabase} from '../../../lib/browser';
export default function OrganizerLogin(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter();
 async function login(e){e.preventDefault();setBusy(true);setError('');try{
   const {error:err}=await browserSupabase().auth.signInWithPassword({email,password});if(err)throw err;
   router.replace('/organizer');
 }catch(err){setError(err.message)}finally{setBusy(false)}}
 return <div className="card narrow"><h1>Organizer Login</h1><p className="muted">Only an organizer explicitly enabled in Supabase can access events.</p><form onSubmit={login}><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/><label>Password</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<div className="error">{error}</div>}<p><button disabled={busy}>{busy?'Signing in…':'Sign in'}</button></p></form><small>Organizer account is created privately in Supabase Dashboard. There is no public signup.</small></div>;
}
