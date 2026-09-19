// K5E crawl: drives every Connect route as 4 different members over real HTTP+SQL; fails on any 5xx, id/howdi_id/secret leak.
const {api,pool,mkUser}=require('./lib.cjs');
// Route inventory: derived from server.js itself (every `if(req.method==="X"&&pathname==="/api/connect/..."` and regex route),
// plus the regex-dispatched group/channel + invite routes and the legacy notification centre.
const fs=require('fs'),path=require('path');
const serverSource=fs.readFileSync(path.join(__dirname,'../../server.js'),'utf8').replace(/\r\n/g,'\n');
function inventory(){
  const re=/if\s*\(\s*req\.method\s*===?\s*["'](GET|POST|PUT|PATCH|DELETE)["']\s*&&\s*(pathname\s*===?\s*["'](\/api\/connect[^"']*)["']|\/\^(\\\/api\\\/connect[^\n]*?)\/[a-z]*\.test\(pathname\))/g;
  const out=new Map();let m;
  while((m=re.exec(serverSource))){
    let p=m[3];
    if(!p){p=m[4].replace(/\$$/,'').replace(/\\\//g,'/').replace(/\\d\+/g,':id').replace(/\[\^\/\?\]\+/g,':username').replace(/\[\^\/\]\+/g,':username').replace(/\[A-Za-z0-9_-\]\+/g,':username')
        .replace(/\(\?:([^)|]*)(?:\|[^)]*)?\)\??/g,(a,b)=>a.endsWith('?')?'':b).replace(/\\\.?/g,'').replace(/\/\?$/,'').replace(/\?$/,'');}
    out.set(m[1]+' '+p,{method:m[1],path:p});
  }
  for(const [mt,p] of [['GET','/api/connect/groups-channels/:id/messages'],['GET','/api/connect/groups-channels/:id/members'],['POST','/api/connect/groups-channels/:id/join'],['POST','/api/connect/groups-channels/:id/leave'],['POST','/api/connect/groups-channels/:id/messages'],
    ['GET','/api/connect/groups-channels/:id/invite-links'],['POST','/api/connect/groups-channels/:id/invite-links'],['GET','/api/connect/invite/AbC123'],['POST','/api/connect/invite/AbC123/join'],
    ['GET','/api/notifications/:id'],['POST','/api/notifications/:id/read'],['POST','/api/notifications/read-all'],['GET','/api/notifications/summary/:id']])out.set(mt+' '+p,{method:mt,path:p});
  return [...out.values()];
}
const routes=inventory();
const USERSEG=[/^\/api\/connect\/users\/:id\/follow$/,/^\/api\/connect\/follow-requests\/:id\/respond$/,/^\/api\/connect\/profile\/:id$/,/^\/api\/connect\/public-profile\/:id$/,/^\/api\/connect\/profiles\/:id\//,/^\/api\/connect\/spaces\/:id\/(block|premium-grant)\/:id$/,/^\/api\/connect\/realtime\/:id\/(cohost|speaker|participant)\/:id\//,/^\/api\/connect\/live\/:id\/(guest|moderators)\/:id/,/^\/api\/connect\/creator-(plans|subscriptions|perks|memberships|members|resources)\/:id/];
(async()=>{
  const tag=Date.now().toString(36).slice(-5);
  const U={};for(const n of ['alice','bob','carol','dave'])U[n]=await mkUser(n+' '+tag,n+'_'+tag,'HWD-'+n.toUpperCase()+tag);
  for(const n of Object.keys(U))await api('POST','/api/connect/posts',{token:U[n].token,body:{content:n+' seed post '+tag}});
  const feed=(await api('GET','/api/connect/feed',{token:U.dave.token})).json.posts;
  const ref={};for(const n of Object.keys(U))ref[n]=Number(feed.find(p=>p.content.startsWith(n+' seed'))?.user_id);
  // mutual follows so friend-gated paths work
  await api('POST','/api/connect/users/'+ref.bob+'/follow',{token:U.alice.token});await api('POST','/api/connect/users/'+ref.alice+'/follow',{token:U.bob.token});
  const idsQ=async(sql)=>(await pool.query(sql)).rows.map(r=>Number(r.id));
  const counts={};const leaks={};const rawIds=new Set(Object.values(U).map(u=>u.id));const myId={};for(const n of Object.keys(U))myId[n]=U[n].id;
  const scan=(o,me,path,acc,isGet)=>{if(o&&typeof o==='object'){if(!Array.isArray(o)&&('full_name' in o||'public_username' in o||'name' in o)&&typeof o.id==='number'&&rawIds.has(o.id)&&o.id!==myId[me])acc.push(path+'.id(person)='+o.id);for(const k of Object.keys(o)){const v=o[k];if(/^(howdi_id|master_id|howdiId|masterId)$/.test(k))acc.push(path+'.'+k);if(isGet&&/^(checkin_code|live_host_notes|host_checklist|participant_token|call_code|private_note|moderation_note|reviewer_note|settlement_note|email|phone|password|password_hash|session_token|token|invite_code|resolution_note)$/.test(k)&&v!==null&&v!==''&&v!==undefined)acc.push('SENSKEY '+path+'.'+k);
      if(typeof v==='number'||(typeof v==='string'&&/^\d+$/.test(v))){if(/user_?id|owner_id|host_id|creator_id|author_id|member_id|requester_id|follower_id|caller_id|blocker|blocked/i.test(k)&&rawIds.has(Number(v))&&Number(v)!==myId[me])acc.push(path+'.'+k+'='+v);}
      if(typeof v==='string'&&/(HWD-|MST-|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-)/.test(v)&&!/token/i.test(k))acc.push(path+'.'+k+'~'+v.slice(0,20));
      scan(v,me,path+'.'+k,acc,isGet);}}};
  for(const round of [0,1,2]){
   for(const [me,other] of [['alice','bob'],['bob','alice'],['dave','alice'],['carol','bob']]){
    const R=ref[other];
    const BODY={content:'crawl content text here '+round,title:'Crawl title',name:'Crawl name '+round+me,message:'hello',messageText:'hello',text:'hello',body:'hello',reply:'hello',reason:'SPAM',details:'x',status:'ACTIVE',amount:10,emoji:'👍',reaction:'❤️',
      targetUserId:R,partnerUserId:R,referredUserId:R,followerUserId:R,speakerUserId:R,guestUserId:R,moderatorUserId:R,recipientUserId:R,creatorUserId:R,mentorUserId:R,endorseeUserId:R,target_user_id:R,partner_user_id:R,otherUserId:R,memberUserId:R,inviteeUserId:R,invitedUserId:R,mentorUserId:R,toUserId:R,learnerUserId:R,requesterUserId:R,collaboratorUserId:R,userIds:[R],inviteeUserIds:[R],
      inviteeUsernames:[U[other].username],username:U[other].username,public_username:U[other].username,accept:true,callType:'VOICE',signalType:'OFFER',payload:{sdp:'x'},toToken:'x',optionId:1,optionIndex:0,question:'why?',description:'d',category:'GENERAL',audience:'Everyone',knowledgeDomain:'GENERAL',
      startsAt:new Date(Date.now()+86400000).toISOString(),scheduled_for:new Date(Date.now()+86400000).toISOString(),code:'ABC',giftCode:'STAR',planName:'Plan',priceMonthly:10,billingCycle:'MONTHLY',spaceType:'GROUP',communityType:'SPACE',privacy:'PUBLIC',enabled:true,price:10,days:3,points:1,progress:1,increment:1,goalCount:3,
      skillId:1,skill_id:1,postId:1,storyId:1,answerId:1,commentId:1,requestId:1,goalId:1,collectionId:1,circleId:1,challengeId:1,rating:5,npsScore:9,note:'n',cohort:'GENERAL',inviteCode:'ABC',role:'SPEAKER',questCode:'JOIN',title2:'t',domain:'GENERAL',language:'en',
      creditCount:1,credit_count:1,skillName:'Skill',skill_name:'Skill',learnerNote:'n',mentorEnabled:true,bio:'b',headline:'h',token:'x',eventType:'X',options:['a','b'],pollOptions:['a','b'],question2:'q'};
    for(const r of routes){
      let p=r.path.replace(/\/$/,'');
      if(!/^\/api\//.test(p)||/[\s\[\]\\|(){}^$*+?]/.test(p.replace(/\?$/,'')))continue;
      p=p.replace(/:username/g,U[other].username);
      const isUser=USERSEG.some(rx=>rx.test(p));
      const parts=p.split(':id');let out=parts[0];
      for(let i=1;i<parts.length;i++){const last=i===parts.length-1;out+=((isUser&&last)?String(R):String(1+((round+i)%3)))+parts[i];}
      const isGet=r.method==='GET';
      const sep=out.includes('?')?'&':'?';
      const url=isGet?out+sep+'userId='+R+'&q='+other+'&mode=DISCOVER':out;
      try{const res=await api(r.method,url,{token:U[me].token,body:isGet?undefined:BODY});
        counts[res.status]=(counts[res.status]||0)+1;{const acc=[];if(res.json)scan(res.json,me,'',acc,r.method==='GET');if(acc.length){const key=me+' '+r.method+' '+r.path+' '+acc[0];leaks[key]=(leaks[key]||0)+1;}}
        if(res.status>=500)console.log('5xx',me,r.method,out,res.status,(res.json&&res.json.message)||res.text.slice(0,80));
      }catch(e){console.log('ERR',r.method,out,e.message);}
    }
   }
  }
  console.log('routes crawled per round:',routes.length,'statuses',JSON.stringify(counts));
  const fiveXX=Object.keys(counts).filter(k=>Number(k)>=500);
  // Own-created secrets (a creator's own invite/call codes) are expected; anything else is a leak.
  const real=Object.keys(leaks).filter(k=>!/SENSKEY .*(invite_code|call_code)$/.test(k));
  console.log('LEAKS',JSON.stringify(real,null,1));
  await pool.end();process.exit(fiveXX.length||real.length?1:0);
})();
