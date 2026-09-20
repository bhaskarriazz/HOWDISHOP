// Learn & Earn STRICT browser smoke (started by run.cjs with LEARN_BROWSER=1): a real Chromium with normal browser security drives the
// PRODUCTION build served from a different origin than the API, so CORS is enforced exactly as in a deployment.
const L=require('./lib.cjs');
const {chromium}=require(process.env.LEARN_PLAYWRIGHT||'playwright-core');
const {pool,mkUser,check}=L;
const APP=process.env.LEARN_APP_URL;
const LEGACY_ID_ROUTE=/\/api\/learning\/(user|learner-home|progress|batches\/user|batch-sessions\/user|live\/bookings)\/\d+/;
(async()=>{
  const A=await mkUser('Asha Browser','asha_browser');
  const q=async(sql,p)=>(await pool.query(sql,p)).rows;
  const ins=(t,pr,m)=>q(`INSERT INTO learning_courses(title,description,category,level,is_active,publish_status,price,purchase_mode,currency) VALUES($1,'Browser course','Skills','Beginner',TRUE,'PUBLISHED',$2,$3,'INR') RETURNING id`,[t,pr,m]);
  const free=(await ins('Browser Basket Weaving',0,'FREE'))[0].id;await ins('Browser Loom Mastery',500,'PAID');
  await q(`INSERT INTO user_course_enrollments(user_id,course_id) VALUES($1,$2::uuid)`,[A.id,free]);
  const browser=await chromium.launch({executablePath:process.env.LEARN_CHROMIUM||undefined,args:['--no-sandbox']});   // NO --disable-web-security
  async function visit(label,url,{token,user,actions}={}){
    const ctx=await browser.newContext({viewport:{width:1280,height:900}});
    if(token)await ctx.addInitScript(([t,u])=>{try{localStorage.setItem('howdiSessionToken',t);if(u)localStorage.setItem('howdiUser',u);}catch(e){}},[token,user||null]);
    // The customer app has http://localhost:5000 compiled in for most of its calls; send those to the server under test.
    // (Only the destination is swapped — the browser still enforces CORS between the page origin and the API.)
    await ctx.route(/^http:\/\/localhost:5000\//,(route)=>route.continue({url:route.request().url().replace('http://localhost:5000',L.BASE)}));
    const page=await ctx.newPage();const errors=[],api=[],bodies={};
    page.on('pageerror',(e)=>errors.push(String(e.message||e)));
    page.on('console',(m)=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push('console: '+m.text());});
    page.on('request',(r)=>{if(/\/api\//.test(r.url()))api.push({url:r.url(),auth:r.headers()['authorization']||''});});
    page.on('response',async(r)=>{if(/\/api\/learning\/me\//.test(r.url())){try{bodies[new URL(r.url()).pathname]={status:r.status(),text:await r.text()};}catch{}}});
    await page.goto(url,{waitUntil:'networkidle',timeout:60000}).catch((e)=>errors.push('goto: '+e.message));
    await page.waitForTimeout(1200);
    if(actions)await actions(page);
    const text=await page.locator('body').innerText();
    if(process.env.LEARN_SHOTS)await page.screenshot({path:`${process.env.LEARN_SHOTS}/${label}.png`});
    await ctx.close();return {text,errors,api,bodies};
  }
  // 1. standalone Learn page, signed out: public catalogue must load cross-origin
  let r=await visit('learn-signed-out',APP+'/learn-earn.html');
  check('learn page (signed out): public catalogue renders both published courses',/Browser Basket Weaving/.test(r.text)&&/Browser Loom Mastery/.test(r.text),r.text.slice(0,240));
  check('learn page (signed out): no CORS / console / page errors (strict browser security)',r.errors.length===0,r.errors.join(' | '));
  // 2. standalone Learn page, signed in: session-only identity (Bearer header), My Learning shows the enrolment
  r=await visit('learn-signed-in',APP+'/learn-earn.html',{token:A.token,actions:async(p)=>{await p.getByText(/my learning/i).first().click({timeout:8000}).catch(()=>{});await p.waitForTimeout(1500);}});
  check('learn page (signed in): My Learning shows the enrolled course',/Browser Basket Weaving/.test(r.text)&&!/Nothing in My Learning yet/.test(r.text),r.text.slice(0,240));
  check('learn page (signed in): no CORS / console / page errors',r.errors.length===0,r.errors.join(' | '));
  const mine=r.api.filter((x)=>/\/api\/learning\/my-learning/.test(x.url));
  check('learn page (signed in): identity travels only as the Bearer token on session-owned calls',mine.length>0&&mine.every((x)=>x.auth==='Bearer '+A.token),mine);
  check('learn page: no request contains a numeric user id in its path',!r.api.some((x)=>LEGACY_ID_ROUTE.test(x.url)),r.api.map((x)=>x.url));
  check('learn page: nothing that identifies the member internally is rendered',!new RegExp(A.howdi+'|MST-|master_id|identity_uuid').test(r.text));
  // 3. the main customer app (multi-page build\'s index.html), signed in: its Learn loaders use the session-owned /me routes
  r=await visit('main-signed-in',APP+'/',{token:A.token,user:JSON.stringify({id:A.id,full_name:A.name,name:A.name,username:A.username})});
  check('main app: no uncaught errors (strict browser security)',r.errors.filter((e)=>!/^console:.*(401|403|404)/.test(e)).length===0,r.errors.join(' | '));
  const mePaths=Object.keys(r.bodies);
  for(const p of ['/api/learning/me/home','/api/learning/me/courses','/api/learning/me/progress'])check(`main app calls ${p} with the session`,r.bodies[p]&&r.bodies[p].status===200,{seen:mePaths});
  check('main app: no request contains a numeric user id in a learner route path',!r.api.some((x)=>LEGACY_ID_ROUTE.test(x.url)),r.api.filter((x)=>LEGACY_ID_ROUTE.test(x.url)).map((x)=>x.url));
  const home=r.bodies['/api/learning/me/home']?JSON.parse(r.bodies['/api/learning/me/home'].text):{};
  check('main app: the learner-home response holds no id / howdi_id / email / phone',JSON.stringify(Object.keys(home.learner||{}))==='["full_name"]'&&!/howdi_id|"email"|"phone"|"user_id"/.test(JSON.stringify(home)),home);
  await browser.close();
  await L.finish('learn browser smoke (strict)');
})().catch(async(e)=>{console.log('CRASH',e&&e.stack||e);process.exit(1);});
