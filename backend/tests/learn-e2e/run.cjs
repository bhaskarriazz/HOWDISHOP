#!/usr/bin/env node
// Learn & Earn end-to-end runner.
//
//   LEARN_PG_URL=postgresql://user:pass@host:5432/disposable_db node backend/tests/learn-e2e/run.cjs
//   LEARN_BROWSER=1 LEARN_PG_URL=... node backend/tests/learn-e2e/run.cjs        # also builds the customer app and runs the STRICT browser smoke
//
// * LEARN_PG_URL must be a DISPOSABLE database (members, courses, sessions... are created).
// * Boots backend/server.js on a free port and runs every NN-*.cjs API suite (real HTTP + real SQL).
// * With LEARN_BROWSER=1 it also runs `vite build` (production, multi-page) into a temp dir with VITE_API_BASE_URL pointing at that server,
//   checks that BOTH index.html and learn-earn.html were emitted, serves the build statically on a different origin and drives it with
//   Chromium with normal browser security (CORS enforced). Needs playwright-core (LEARN_PLAYWRIGHT or NODE_PATH) and, optionally, LEARN_CHROMIUM.
const {spawn,spawnSync}=require('node:child_process');
const fs=require('node:fs');const http=require('node:http');const net=require('node:net');const os=require('node:os');const path=require('node:path');
const PG=process.env.LEARN_PG_URL;
if(!PG){console.error('LEARN_PG_URL is required (disposable PostgreSQL database).');process.exit(2);}
const freePort=()=>new Promise((ok,bad)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});s.on('error',bad);});
const sleep=(ms)=>new Promise((r)=>setTimeout(r,ms));
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'};
(async()=>{
  const api=await freePort();const apiBase=`http://127.0.0.1:${api}`;
  const server=spawn(process.execPath,[path.join(__dirname,'../../server.js')],{cwd:path.join(__dirname,'../..'),
    env:{...process.env,DATABASE_URL:PG,PORT:String(api),HOST:'127.0.0.1',HOWDI_CONNECT_REF_SECRET:'learn-e2e'},stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',(d)=>{log+=d;});server.stderr.on('data',(d)=>{log+=d;});
  let up=false;
  for(let i=0;i<120&&!up;i++){await sleep(1000);if(server.exitCode!==null)break;try{up=(await fetch(apiBase+'/api/health')).ok;}catch{}}
  if(!up){console.error('server did not start:\n'+log.slice(-3000));server.kill();process.exit(2);}
  await sleep(4000); // async schema bootstraps
  let failed=0,site=null;const cleanup=()=>{try{server.kill();}catch{}try{site&&site.close();}catch{}};
  // async on purpose: the static site server below must keep answering while a suite runs
  const runSuite=(f,extra={})=>new Promise((done)=>{
    const c=spawn(process.execPath,[path.join(__dirname,f)],{env:{...process.env,LEARN_BASE_URL:apiBase,...extra},stdio:['ignore','pipe','pipe']});
    let out='';c.stdout.on('data',(d)=>{out+=d;});c.stderr.on('data',(d)=>{out+=d;});
    const timer=setTimeout(()=>c.kill(),10*60*1000);
    c.on('close',(code)=>{clearTimeout(timer);
      console.log(`${code===0?'PASS':'FAIL'}  ${f}  ${out.trim().split('\n').slice(-1)[0]}`);
      if(code!==0){failed++;console.log(out.split('\n').filter((l)=>/FAIL|CRASH|Error/.test(l)).slice(0,40).join('\n'));}
      done();});
  });
  await runSuite('01-session-routes.cjs');
  await runSuite('03-guides-and-classroom-security.cjs');
  if(process.env.LEARN_BROWSER){
    const customer=path.join(__dirname,'../../../apps/customer');
    const dist=fs.mkdtempSync(path.join(os.tmpdir(),'learn-dist-'));
    const b=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['vite','build','--outDir',dist,'--emptyOutDir'],{cwd:customer,env:{...process.env,VITE_API_BASE_URL:apiBase},encoding:'utf8',timeout:5*60*1000});
    if(b.status!==0){failed++;console.log('FAIL  vite build\n'+((b.stdout||'')+(b.stderr||'')).slice(-1500));}
    else{
      const both=['index.html','learn-earn.html'].every((f)=>fs.existsSync(path.join(dist,f)));
      console.log(`${both?'PASS':'FAIL'}  production build emits dist/index.html AND dist/learn-earn.html`);if(!both)failed++;
      const sport=await freePort();
      site=http.createServer((req,res)=>{
        const p=decodeURIComponent(new URL(req.url,'http://x').pathname);const f=path.join(dist,p==='/'?'index.html':p);
        if(!f.startsWith(dist)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('not found');}
        res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
      }).listen(sport,'127.0.0.1');
      if(both)await runSuite('02-browser-smoke.cjs',{LEARN_APP_URL:`http://127.0.0.1:${sport}`});
    }
  }
  cleanup();process.exit(failed?1:0);
})();
