// P7 runtime checks in the customer-visible shared browser. Start the real app/API
// first. Optional HOWDI_P7_LOGIN_FILE contains a synthetic preview email/password.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.HOWDI_PREVIEW_URL || 'http://localhost:5173';
const out = process.env.HOWDI_PROOF_DIR || '/tmp/howdi-p7-proof';
mkdirSync(out, { recursive: true });
const resumeAuth = process.argv.includes('--auth-only');
const results = resumeAuth ? JSON.parse(readFileSync(`${out}/browser-results.json`, 'utf8')).filter(x => x.status === 'passed').map(x => ({...x, reused: true})) : [];
function run(...args) {
  const response = JSON.parse(execFileSync('coderabbit-agent-browser', [...args, '--json'], { encoding: 'utf8', timeout: 35000 }));
  if (!response.success) throw Error(response.error || `Browser command failed: ${args[0]}`);
  return response.data;
}
const evaluate = (js) => run('eval', js).result;
const waitFor = (condition) => evaluate(`(async()=>{for(let i=0;i<100;i++){if(${condition})return true;await new Promise(r=>setTimeout(r,50));}throw Error('Expected browser state did not appear');})()`);
const pass = (name) => { for (let i=results.length-1;i>=0;i--) if(results[i].name===name)results.splice(i,1); results.push({ name, status: 'passed' }); console.log('PASS '+name); };
const open = (path) => { run('open', base+path); waitFor('document.querySelector(".hf-page")'); };
// Secondary audience actions are disclosed by the presentation, using native details.
const clickAction = (selector) => {
  evaluate(`(()=>{const d=document.querySelector(${JSON.stringify(selector)})?.closest('details');if(d&&!d.open)d.querySelector('summary').click();document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center'});})()`);
  run('click', selector);
};
try {
  run('open', base+'/for/students');
  evaluate('localStorage.removeItem("howdiUser");localStorage.removeItem("howdiSessionToken")');
  if (!resumeAuth) {
  for (const width of [1440, 768, 390]) {
    run('set', 'viewport', String(width), '1000');
    for (const audience of ['students','institutes','startups']) {
      open('/for/'+audience);
      const state = evaluate(`(()=>{const page=document.querySelector('.hf-app-overlay'),r=page.getBoundingClientRect();const nav=document.querySelector(innerWidth>760?'.v8-rail nav':'.v8-bottombar');return {heading:!!document.querySelector('#hf-${audience}-title'),overflow:page.scrollWidth>page.clientWidth+1,nav:[...nav.querySelectorAll('button')].map(x=>x.textContent.trim()),links:page.querySelectorAll('.hf-action').length,focused:document.activeElement?.tagName,top:r.top,left:r.left,auth:!!localStorage.getItem('howdiSessionToken')};})()`);
      assert.equal(state.heading,true);assert.equal(state.overflow,false);assert.equal(state.auth,false);
      assert.deepEqual(state.nav.filter(x=>x!=='Customize'),['Home','Connect','Shop','Move','Work','Learn']);
      assert.ok(state.links>=7);assert.ok(state.top>0);assert.equal(state.focused,'H1');
      run('screenshot',`${out}/${audience}-${width}.png`);
      pass(`${audience}: public ${width}px layout, six-pillar navigation, focus, no overflow`);
    }
  }
  run('set','viewport','1440','1000');
  const destinations=[
    ['students','/learn/courses','input[placeholder^="Search crochet"]'],
    ['institutes','/works','.v8w-q input'],
    ['startups','/shop',null],
    ['students','/connect/communities','.v8cm-search input'],
  ];
  for(const [audience,path,input] of destinations){
    open(`/for/${audience}?q=crochet`);
    clickAction(`a.hf-action[href^="${path}?"]`);
    waitFor(`location.pathname===${JSON.stringify(path)}&&!document.querySelector('.hf-app-overlay')`);
    assert.equal(evaluate('new URLSearchParams(location.search).get("q")'),'crochet');
    if(input&&path!=='/connect/communities'){waitFor(`document.querySelector(${JSON.stringify(input)})`);assert.equal(evaluate(`document.querySelector(${JSON.stringify(input)}).value`),'crochet');}
    if(path==='/shop'||path==='/connect/communities'){waitFor(`[...document.querySelectorAll('input')].some(x=>x.value==='crochet')`);}
    run('reload');waitFor(`location.pathname===${JSON.stringify(path)}&&[...document.querySelectorAll('input')].some(x=>x.value==='crochet')`);
    assert.equal(evaluate('new URLSearchParams(location.search).get("from")'),`for-${audience}`);
    pass(`${audience} → ${path}: topic, source context and refresh`);
  }
  }
  run('set','viewport','1440','1000');
  open('/for/institutes');clickAction('a.hf-action[href^="/me/apply/institute"]');
  waitFor('document.querySelector(".v8a-scrim")');
  assert.equal(evaluate('location.pathname'),'/for/institutes');
  run('screenshot',`${out}/institute-signin-required.png`);
  evaluate('document.querySelector(".v8a-scrim button[aria-label=Close]").click()');
  waitFor('!document.querySelector(".v8a-scrim")');
  pass('Protected institute action opens sign-in; cancellation keeps audience page');
  if(process.env.HOWDI_P7_LOGIN_FILE){
    const credentials=JSON.parse(readFileSync(process.env.HOWDI_P7_LOGIN_FILE,'utf8'));
    clickAction('a.hf-action[href^="/me/apply/institute"]');waitFor('document.querySelector(".v8a-scrim")');
    evaluate('[...document.querySelectorAll(".v8a-scrim button")].find(x=>x.textContent.includes("Sign in with email")).click()');
    waitFor('document.querySelector("input[type=email]")');
    run('fill','input[type=email]',credentials.email);run('fill','input[type=password]',credentials.password);
    evaluate('[...document.querySelectorAll(".v8a-scrim button")].find(x=>x.textContent.trim()==="Sign in").click()');
    waitFor('location.pathname==="/me/apply/institute"&&!document.querySelector(".v8a-scrim")');
    assert.equal(evaluate('new URLSearchParams(location.search).get("from")'),'for-institutes');
    waitFor('document.querySelector(".v8l-apply input")');
    run('screenshot',`${out}/institute-login-return.png`);
    const roles=evaluate(`(async()=>{const headers={Authorization:'Bearer '+localStorage.getItem('howdiSessionToken')};const roles=await fetch('http://localhost:5000/api/v8/me/roles',{headers}).then(r=>r.json());const teacher=await fetch('http://localhost:5000/api/v8/learn/teach',{headers});return {roles:roles.items.map(x=>({code:x.code,status:x.status})),teacherStatus:teacher.status};})()`);
    for(const code of ['institute','startup','teacher','vendor'])assert.equal(roles.roles.find(x=>x.code===code).status,'none');
    assert.equal(roles.teacherStatus,403);
    pass('Real login resumes institute application; no organisation/vendor/teacher grants; teacher API denies access');
  }else{results.push({name:'Real login return',status:'skipped',reason:'HOWDI_P7_LOGIN_FILE not supplied'});}
  open('/for/startups?q=materials');clickAction('a.hf-action[href^="/shop?"]');waitFor('location.pathname==="/shop"');
  run('back');waitFor('document.querySelector("#hf-startups-title")');assert.equal(evaluate('document.querySelector("#hf-topic").value'),'materials');
  run('forward');waitFor('location.pathname==="/shop"&&!document.querySelector(".hf-app-overlay")');
  pass('Browser back/forward restores audience query and destination');
  open('/for/students');run('click','.v8-rail nav button');waitFor('!document.querySelector(".hf-app-overlay")');
  pass('Existing Home navigation exits audience page');
}catch(error){results.push({name:'Runtime verification',status:'failed',reason:error.message});console.error(error.message);process.exitCode=1;}
finally{writeFileSync(`${out}/browser-results.json`,JSON.stringify(results,null,2));}
