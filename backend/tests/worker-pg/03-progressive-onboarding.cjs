// Stage 3 — progressive Worker/Vendor onboarding contract, real PostgreSQL + real server.
// WORKER_PG_URL=postgresql://... node backend/tests/worker-pg/03-progressive-onboarding.cjs
const fs=require('node:fs');
const path=require('node:path');
const L=require('./lib.cjs');
const {pool,api,mkUser,check,finish}=L;
const uploadDir=path.join(__dirname,'../../private_uploads/worker_applications');
const before=new Set(fs.existsSync(uploadDir)?fs.readdirSync(uploadDir):[]);
const cleanUploads=()=>{if(!fs.existsSync(uploadDir))return;for(const f of fs.readdirSync(uploadDir))if(!before.has(f))fs.unlinkSync(path.join(uploadDir,f));};
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const noInternal=(value)=>!/("(?:id|userId|user_id|convertedWorkerId|convertedVendorId|profilePhotoFile|liveSelfieFile|kycDocumentFile|certificateFile|experienceFile)"\s*:)/.test(JSON.stringify(value));
const png='data:image/png;base64,iVBORw0KGgo=';

(async()=>{
  const started=await L.start();check('server starts on a fresh database',started,L.serverLog().slice(-500));
  if(!started)return finish('stage3 progressive onboarding');
  const a=await mkUser('Asha Applicant'),b=await mkUser('Bilal Applicant');

  let r=await api('GET','/api/onboarding/worker/draft');
  check('worker draft requires a session',r.status===401,r);
  r=await api('GET','/api/onboarding/worker/draft',{token:a.token});
  check('new worker draft is an empty public projection',r.status===200&&r.json?.draft?.role==='worker'&&r.json.draft.step===1&&JSON.stringify(r.json.draft.fields)==='{}'&&noInternal(r.json),r.json);
  r=await api('PUT','/api/onboarding/worker/draft',{token:a.token,body:{step:1.5,fields:{}}});
  check('draft rejects a fractional step with a safe validation response',r.status===400&&r.json?.code==='INVALID_ONBOARDING_STEP'&&!/postgres|syntax|smallint/i.test(JSON.stringify(r.json)),r.json);

  r=await api('PUT','/api/onboarding/worker/draft',{token:a.token,body:{step:2,fields:{fullName:'Asha Applicant',phone:'9000000001',email:'asha@example.test',city:'Warangal',workingDays:['Mon','Tue'],userId:b.id,convertedWorkerId:999,profilePhoto:{dataUrl:'should-not-save'},arbitrary:'drop me'}}});
  check('worker draft saves only allowlisted fields and no internal ids',r.status===200&&r.json.draft.step===2&&r.json.draft.fields.fullName==='Asha Applicant'&&r.json.draft.fields.phone==='9000000001'&&Array.isArray(r.json.draft.fields.workingDays)&&!own(r.json.draft.fields,'userId')&&!own(r.json.draft.fields,'convertedWorkerId')&&!own(r.json.draft.fields,'profilePhoto')&&!own(r.json.draft.fields,'arbitrary')&&noInternal(r.json),r.json);
  r=await api('GET','/api/onboarding/worker/draft',{token:b.token});
  check('worker draft is isolated to its session owner',r.status===200&&r.json.draft.step===1&&JSON.stringify(r.json.draft.fields)==='{}',r.json);
  r=await api('GET','/api/onboarding/worker/draft?userId='+a.id,{token:b.token});
  check('body/query user id cannot select another worker draft',r.status===200&&JSON.stringify(r.json.draft.fields)==='{}'&&noInternal(r.json),r.json);

  r=await api('POST','/api/works/whatsapp-assist',{body:{fullName:'Asha Applicant',phone:'9000000001',city:'Warangal',claimedSkill:'Plumber',message:'Need help'}});
  check('WhatsApp assistance returns a public reference without an internal lead id',r.status===201&&/^HOWDI-WAHELP-/.test(r.json?.lead?.leadCode||'')&&Object.keys(r.json?.lead||{}).sort().join(',')==='createdAt,leadCode,status'&&noInternal(r.json),r.json);

  const worker={fullName:'Asha Applicant',phone:'9000000001',email:'asha@example.test',gender:'female',age:24,city:'Warangal',claimedSkill:'Plumber',consent:true,declaration:true,kycDocumentType:'PAN',kycIdLast4:'1234',profilePhoto:{dataUrl:png},liveSelfie:{dataUrl:png},kycDocument:{dataUrl:png},userId:b.id,workerId:123};
  r=await api('POST','/api/onboarding/worker/submit',{token:a.token,body:{...worker,fullName:'A'.repeat(1000)}});
  check('worker submit rejects overlong fields without a database detail',r.status===400&&r.json?.code==='INVALID_ONBOARDING_DETAILS'&&!/postgres|value too long|character varying/i.test(JSON.stringify(r.json)),r.json);
  r=await api('POST','/api/onboarding/worker/submit',{token:a.token,body:worker});
  check('worker progressive submit succeeds with a public acknowledgement only',r.status===201&&r.json?.status==='success'&&Object.keys(r.json.application||{}).sort().join(',')==='applicationCode,status,submittedAt'&&/^HOWDI-WA-/.test(r.json.application.applicationCode||'')&&noInternal(r.json),r.json);
  const wa=(await pool.query(`SELECT user_id,application_code FROM works_worker_applications WHERE full_name='Asha Applicant'`)).rows[0];
  check('worker submit binds the database record to the session, not body userId',Number(wa?.user_id)===a.id&&wa.application_code===r.json.application.applicationCode,wa);
  r=await api('GET','/api/onboarding/worker/draft',{token:a.token});
  check('worker submit removes the saved draft',r.status===200&&r.json.draft.step===1&&JSON.stringify(r.json.draft.fields)==='{}',r.json);

  r=await api('GET','/api/onboarding/vendor/draft',{token:a.token});
  check('new vendor draft is separate from worker draft',r.status===200&&r.json.draft.role==='vendor'&&JSON.stringify(r.json.draft.fields)==='{}'&&noInternal(r.json),r.json);
  r=await api('PUT','/api/onboarding/vendor/draft',{token:a.token,body:{step:3,fields:{businessName:'Asha Makes',ownerName:'Asha Applicant',phone:'9000000001',category:'Crochet & Handmade',city:'Warangal',user_id:b.id,convertedVendorId:777}}});
  check('vendor draft uses the same allowlist and session boundary',r.status===200&&r.json.draft.step===3&&r.json.draft.fields.businessName==='Asha Makes'&&!own(r.json.draft.fields,'user_id')&&!own(r.json.draft.fields,'convertedVendorId')&&noInternal(r.json),r.json);
  r=await api('GET','/api/onboarding/vendor/draft',{token:b.token});
  check('vendor draft cannot be read by a different signed-in applicant',r.status===200&&JSON.stringify(r.json.draft.fields)==='{}',r.json);
  const vendor={businessName:'Asha Makes',ownerName:'Asha Applicant',phone:'9000000001',city:'Warangal',category:'Crochet & Handmade',productSummary:'Handmade crochet bags',consent:true,userId:b.id};
  r=await api('POST','/api/onboarding/vendor/submit',{token:a.token,body:vendor});
  check('vendor progressive submit succeeds with a public acknowledgement only',r.status===201&&r.json?.status==='success'&&Object.keys(r.json.application||{}).sort().join(',')==='applicationCode,status,submittedAt'&&/^HOWDI-VA-/.test(r.json.application.applicationCode||'')&&noInternal(r.json),r.json);
  const va=(await pool.query(`SELECT user_id,application_code FROM howdi_vendor_applications WHERE business_name='Asha Makes'`)).rows[0];
  check('vendor submit binds the database record to the session, not body userId',Number(va?.user_id)===a.id&&va.application_code===r.json.application.applicationCode,va);
  r=await api('POST','/api/onboarding/vendor/submit',{body:vendor});
  check('progressive vendor submit requires a session',r.status===401&&noInternal(r.json),r.json);
  check('no uncaught server error occurred',!/UnhandledPromiseRejection|uncaughtException/i.test(L.serverLog()),L.serverLog().slice(-500));
  cleanUploads();
  return finish('stage3 progressive onboarding');
})().catch(async (error)=>{console.error(error);check('stage3 suite completes without unexpected exception',false,String(error&&error.stack||error));cleanUploads();return finish('stage3 progressive onboarding');});
