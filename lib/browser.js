'use client';
import { createClient } from '@supabase/supabase-js';
let browser;
export function browserSupabase(){
  if(!browser) browser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return browser;
}
export async function organizerFetch(url,options={}){
  const {data,error}=await browserSupabase().auth.getSession();
  if(error || !data.session) throw new Error('Organizer login required.');
  const response=await fetch(url,{...options,cache:'no-store',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{}),Authorization:`Bearer ${data.session.access_token}`}});
  const body=await response.json().catch(()=>({error:`HTTP ${response.status}`}));
  if(!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}
