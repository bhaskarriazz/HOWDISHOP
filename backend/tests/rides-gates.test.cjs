'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createRidesV8, validAt, quote } = require('../rides-v8.cjs');
test('preview gate needs every condition; production cannot enable it', async () => {
 const original = { flag: process.env.HOWDI_RIDES_PREVIEW, env: process.env.NODE_ENV };
 try {
  for (const [flag, env, db, sandbox, want] of [
   [undefined,'development','test_preview',true,false],['0','development','test_preview',true,false],
   ['1','production','test_preview',true,false],['1','development','production',true,false],
   ['1','development','test_preview',false,false],['1','development','test_preview',true,true]
  ]) {
   if (flag === undefined) delete process.env.HOWDI_RIDES_PREVIEW; else process.env.HOWDI_RIDES_PREVIEW=flag;
   process.env.NODE_ENV=env;
   const mod=createRidesV8({pool:{query:async sql=>({rows:[{name:db}]})},helpers:{},sandboxEnabled:()=>sandbox});
   await mod.ensureSchema(); assert.equal(mod.enabled(),want,JSON.stringify([flag,env,db,sandbox]));
  }
 } finally { for(const [key,value] of [['HOWDI_RIDES_PREVIEW',original.flag],['NODE_ENV',original.env]]) if(value===undefined)delete process.env[key];else process.env[key]=value; }
});
test('all three document boundaries, class, zone and accessibility are mandatory',()=>{
 const at=Date.parse('2030-01-01T00:00:00Z'), future=new Date(at+1).toISOString();
 const a={state:'approved',zone:'pilot',vehicle_class:'Auto',details:{licence_until:future,permit_until:future,insurance_until:future,accessibility:'step_free'}};
 assert.equal(validAt(a,'pilot','Auto',at,'step_free'),true);
 for(const k of ['licence_until','permit_until','insurance_until'])assert.equal(validAt({...a,details:{...a.details,[k]:new Date(at).toISOString()}},'pilot','Auto',at),false);
 assert.equal(validAt(a,'other','Auto',at),false);assert.equal(validAt(a,'pilot','Cab',at),false);assert.equal(validAt({...a,state:'draft'},'pilot','Auto',at),false);
 assert.equal(validAt({...a,details:{...a.details,accessibility:'none'}},'pilot','Auto',at,'step_free'),false);
});
test('server fare uses validated inputs, not a browser supplied total',()=>{
 const now=Date.parse('2030-01-01T00:00:00Z'),input={zone:'pilot',vehicle_class:'Auto',pickup:'North gate',destination:'South gate',scheduled_at:new Date(now+3600000).toISOString(),payment:'cash',accessibility:'none',fare:{total:1}};
 assert.equal(quote(input,'pilot',now).fare.total,5500);
 assert.throws(()=>quote({...input,vehicle_class:'Bike'},'pilot',now));assert.throws(()=>quote({...input,payment:'live'},'pilot',now));
 assert.throws(()=>quote({...input,scheduled_at:new Date(now+1).toISOString()},'pilot',now));
});
