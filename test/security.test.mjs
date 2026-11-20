import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileNumber,participantCode,qrToken,hashAccess,matchesAccess,csv,eventLocalDate} from '../lib/security.js';
process.env.MEMBER_ACCESS_PEPPER = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
test('Indian mobile normalizer',()=>{
  assert.equal(mobileNumber('+91 98765-43210'),'9876543210');
  assert.equal(mobileNumber(9876543210),'9876543210');
  assert.equal(mobileNumber('0000000000'),null);
});
test('participant password follows the mobile suffix rule',()=>{
 assert.equal(participantCode('9876543210'),'321009');
 assert.equal(participantCode('+91 98765-43210'),'321009');
 assert.equal(participantCode(9876543210),'321009');
 assert.equal(participantCode('9876500012'),'001209');
 assert.equal(participantCode('9876500000'),'000009');
 assert.throws(()=>participantCode('0000000000'),/Invalid participant mobile/);
 assert.throws(()=>participantCode(''),/Invalid participant mobile/);
});
test('participant password HMAC verification and random QR tokens',()=>{
 const code=participantCode('9876543210');
 const hash=hashAccess(code);assert.equal(hash.length,64);
 assert.equal(matchesAccess(code,hash),true);
 assert.equal(matchesAccess('321008',hash),false);
 assert.equal(matchesAccess('000009',hash),false);
 assert.equal(qrToken().length,32);
 assert.notEqual(qrToken(),qrToken());
});
test('CSV protects formulas and properly escapes quotes',()=>{
 const content=csv([['name','value'],['Test','=SUM(1,2)'],['A "name"','+cmd']]);
 assert.match(content,/"'=SUM\(1,2\)"/);
 assert.match(content,/"A ""name"""/);
 assert.match(content,/"'\+cmd"/);
});
test('event timezone date has ISO shape',()=>{
 assert.match(eventLocalDate('Asia/Kolkata'),/^\d{4}-\d{2}-\d{2}$/);
});
