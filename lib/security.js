import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
export function secret(name){const s=process.env[name];if(!s||s.length<32)throw new Error(`Set a secure ${name} environment variable`);return s}
export function participantCode(mobile){
  const number=mobileNumber(mobile);
  if(!number)throw new Error('Invalid participant mobile number');
  return number.slice(-4)+'09';
}
export function qrToken(){return randomBytes(24).toString('base64url')}
export function hashAccess(code){return createHmac('sha256',secret('MEMBER_ACCESS_PEPPER')).update(code,'utf8').digest('hex')}
export function matchesAccess(code,hash){try{const a=Buffer.from(hashAccess(code),'hex');const b=Buffer.from(hash,'hex');return a.length===b.length && timingSafeEqual(a,b)}catch{return false}}
export function hashIp(ip){return createHmac('sha256',secret('MEMBER_ACCESS_PEPPER')).update('ip:'+ip).digest('hex')}
export function mobileNumber(value){let x=String(value??'').replace(/[^0-9]/g,'');if(x.length===12&&x.startsWith('91'))x=x.slice(2);return /^[6-9][0-9]{9}$/.test(x)?x:null}
export function shortText(value,max=150){return String(value??'').trim().slice(0,max)}
export const FIELD_NAMES=['first_name','father_name','surname','mobile','pincode','village','taluka','district','address'];
export function isAllowedMapping(v){return FIELD_NAMES.includes(v)||v==='ignore'||(typeof v==='string'&&/^extra:[^<>]{1,70}$/.test(v))}
export function sanitizeSpreadsheetCell(v){const s=String(v??'');return /^[\s]*[=+@\-\t\r]/.test(s)?`'${s}`:s}
export function csv(rows){return '\ufeff'+rows.map(row=>row.map(v=>`"${sanitizeSpreadsheetCell(v).replace(/"/g,'""')}"`).join(',')).join('\r\n')}
export function eventLocalDate(tz='Asia/Kolkata'){
  const p=new Intl.DateTimeFormat('en-GB',{timeZone:tz,day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date());
  const part=k=>p.find(i=>i.type===k).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
