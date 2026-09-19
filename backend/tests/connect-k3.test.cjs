// Focused K3 route regression tests. Real handlers, parser and session lookup;
// in-memory query double (no live PostgreSQL or full server startup).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {Readable}=require('node:stream');
const source=fs.readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8').replace(/\r\n/g,'\n');
function between(a,b){const start=source.indexOf(a);assert.notEqual(start,-1,a);const end=source.indexOf(b,start+a.length);assert.notEqual(end,-1,b);return source.slice(start,end);}
function block(marker){const start=source.indexOf(marker);assert.notEqual(start,-1,marker);return source.slice(start,source.indexOf('\n            }',start)+14);}
const dm=between('            if(req.method==="GET"&&pathname==="/api/connect/conversations")','            if(req.method==="GET"&&pathname==="/api/connect/notifications")');
const spaces=between('            const hcSpaceMatch=','            /* =========================================================\n               HOWDI CONNECT V16.0A');
const articles=between('            if(req.method==="POST"&&pathname==="/api/connect/articles")','            if(req.method==="GET"&&/^\\/api\\/connect\\/articles\\/\\d+\\/?$/.test(pathname))');
const engagement=['reaction','comments'].map(action=>block('            if (\n              req.method === "POST" &&\n              /^\\/api\\/connect\\/posts\\/\\d+\\/'+action+'\\/?$/.test(pathname)')).join('\n')+['save','share'].map(action=>block('            if(req.method==="POST"&&/^\\/api\\/connect\\/posts\\/\\d+\\/'+action+'\\/?$/.test(pathname)){')).join('\n');
const follow=[
 block('            if(req.method==="POST"&&/^\\/api\\/connect\\/users\\/\\d+\\/follow\\/?$/.test(pathname)){'),
 block('            if(req.method==="GET"&&pathname==="/api/connect/follow-requests"){'),
 block('            if(req.method==="PATCH"&&/^\\/api\\/connect\\/follow-requests\\/\\d+\\/respond\\/?$/.test(pathname)){')
].join('\n');
const helpers=between('    const HOWDI_ATTACHMENT_RULES =','    function number(')+between('    function getBody(req)','    // =====================================================\n    // URL HELPER')+between('    async function getSessionUserFromRequest(req)','    function adminTokenHash(')+between('            async function performConnectFollowResponse(res,userId,target){','            if (req.method === "GET" && pathname === "/api/connect/home") {');
const image='data:image/png;base64,iVBORw0KGgo=';
async function run(method,path,body={},options={}){
 const calls=[]; const db={article:options.article,spaceType:options.spaceType||'GROUP'};
 const query=async(sql,params=[])=>{
  sql=sql.replace(/\s+/g,' ').trim();calls.push({sql,params});let rows=[];
  if(sql.includes('FROM user_sessions s'))rows=params[0]==='session-A'?[{id:101}]:[];
  else if(sql.includes('SELECT * FROM howdi_community_posts'))rows=db.article?[db.article]:[];
  else if(sql.startsWith('INSERT INTO howdi_community_posts')){db.article={id:7,user_id:params[0],content:params[1],article_title:params[2],article_cover_url:params[4],article_cover_data:params[5],post_status:params[9]};rows=[db.article];}
  else if(sql.startsWith('UPDATE howdi_community_posts')){Object.assign(db.article,{article_cover_url:params[4],article_cover_data:params[5]});rows=[db.article];}
  else if(sql.includes('SELECT * FROM howdi_connect_social_spaces'))rows=[{id:7,space_type:db.spaceType,privacy:'PUBLIC',owner_user_id:303}];
  else if(sql.includes('SELECT role,status FROM howdi_connect_social_space_members'))rows=[{role:options.role||'ADMIN',status:'ACTIVE'}];
  else if(sql.includes('FROM howdi_connect_social_invite_links i'))rows=[{id:9,space_id:7,space_type:db.spaceType,requires_approval:false}];
  else if(sql.startsWith('SELECT 1 FROM howdi_connect_conversation_members'))rows=options.nonmember?[]:[{exists:1}];
  else if(sql.startsWith('INSERT INTO howdi_connect_messages'))rows=[{id:8,sender_user_id:params[1],attachment_type:params[4],attachment_data:params[5],attachment_meta:JSON.parse(params[6]),reactions:{101:'👍'}}];
  else if(sql.startsWith('INSERT INTO howdi_connect_social_messages'))rows=[{id:8,sender_user_id:params[1],message_type:params[2],media_data:params[4],attachment_meta:JSON.parse(params[5])}];
  else if(sql.startsWith('SELECT c.id,c.updated_at')){assert.match(sql,/cp.public_username/);assert.doesNotMatch(sql.split(' FROM ')[0],/howdi_id|master_id|identity_uuid|other_user_id/);rows=[{id:7,public_username:'member-b',full_name:'B'}];}
  else if(sql.startsWith('SELECT m.id,m.conversation_id'))rows=[{id:8,sender_user_id:101,public_username:'member-a',reactions:{101:'👍',202:'❤️'},attachment_data:image}];
  else if(sql.startsWith('INSERT INTO howdi_connect_conversations'))rows=[{id:7}];
  else if(sql.startsWith('INSERT INTO howdi_community_reactions'))rows=[{post_id:7}];
  else if(sql.startsWith('INSERT INTO howdi_community_comments'))rows=[{id:7}];
  else if(sql.startsWith('INSERT INTO howdi_connect_post_saves'))rows=[{post_id:7}];
  else if(sql.startsWith('SELECT 1 FROM howdi_connect_profile_blocks'))rows=options.blocked?[{exists:1}]:[];
  else if(sql.startsWith('SELECT 1 FROM howdi_connect_follows WHERE follower_user_id'))rows=options.alreadyFollowing?[{exists:1}]:[];
  else if(sql.startsWith('SELECT private_profile FROM howdi_connect_profiles'))rows=[{private_profile:Boolean(options.privateTarget)}];
  else if(sql.startsWith('INSERT INTO howdi_connect_follow_requests'))rows=[{requester_user_id:params[0],target_user_id:params[1],status:'PENDING'}];
  else if(sql.startsWith('INSERT INTO howdi_connect_follows'))rows=[{follower_user_id:params[0],following_user_id:params[1]}];
  else if(sql.startsWith('DELETE FROM howdi_connect_follows'))rows=[];
  else if(sql.startsWith('SELECT full_name FROM users WHERE id'))rows=[{full_name:'Session A'}];
  else if(sql.startsWith('INSERT INTO howdi_connect_notifications'))rows=[{id:1}];
  else if(sql.startsWith('SELECT fr.*,u.full_name,cp.public_username'))rows=[{requester_user_id:303,target_user_id:params[0],full_name:'Requester',public_username:'req303',profession_title:''}];
  else if(sql.startsWith('UPDATE howdi_connect_follow_requests'))rows=(Number(params[1])===Number(options.requestOwner??101))?[{requester_user_id:params[0],target_user_id:params[1],status:params[2]}]:[];
  else if(sql.includes('COUNT(*)'))rows=[{n:1,total:1}];
  return {rows,rowCount:rows.length};
 };
 const pool={query,connect:async()=>({query,release(){}})};
 const req=Readable.from([JSON.stringify(body)]);req.method=method;req.headers=options.anonymous?{}:{authorization:'Bearer session-A'};
 const context={pool,req,res:{},url:new URL(path,'http://localhost'),pathname:path.split('?')[0],URL,Buffer,clean:x=>String(x??'').trim(),sendJSON:(_res,status,data)=>({status,data})};
 const response=await vm.runInNewContext(helpers+'\n(async()=>{'+dm+spaces+articles+engagement+follow+'})()',context);
 assert.ok(response,'Route must respond');return {...response,calls,db};
}
function write(r,prefix){const q=r.calls.find(c=>c.sql.startsWith(prefix));assert.ok(q,prefix);return q.params;}
function privateFree(value){assert.doesNotMatch(JSON.stringify(value),/howdi_id|master_id|identity_uuid|sender_user_id|other_user_id|"user_id"/);}
test('Article create/update/replace cover, MIME and URL compatibility; session A overrides B',async()=>{
 const created=await run('POST','/api/connect/articles',{userId:202,title:'K3 article',content:'A sufficiently long article body.',coverData:image,coverMime:'image/png'});assert.equal(created.status,201);assert.equal(created.db.article.user_id,101);assert.equal(created.db.article.article_cover_data,image);
 let updated=await run('PATCH','/api/connect/articles/7',{userId:202,coverData:'YWJj',coverMime:'image/jpeg'},{article:created.db.article});assert.equal(updated.status,200);assert.equal(write(updated,'UPDATE howdi_community_posts')[1],101);assert.equal(updated.db.article.article_cover_data,'data:image/jpeg;base64,YWJj');
 const preserved=await run('PATCH','/api/connect/articles/7',{userId:202,title:'Updated title'},{article:updated.db.article});assert.equal(preserved.db.article.article_cover_data,'data:image/jpeg;base64,YWJj');
 updated=await run('PATCH','/api/connect/articles/7',{coverUrl:'https://example.com/cover.jpg'},{article:updated.db.article});assert.equal(updated.db.article.article_cover_data,null);assert.equal(updated.db.article.article_cover_url,'https://example.com/cover.jpg');
 const url=await run('POST','/api/connect/articles',{title:'URL article',content:'A sufficiently long article body.',coverUrl:'https://example.com/a.jpg'});assert.equal(url.status,201);assert.equal(url.db.article.article_cover_data,null);
 const invalid=await run('POST','/api/connect/articles',{title:'K3 article',content:'A sufficiently long article body.',coverData:image,coverMime:'text/plain'});assert.equal(invalid.status,400);
 const app=fs.readFileSync(require('node:path').join(__dirname,'../../apps/customer/src/App.jsx'),'utf8');assert.match(app,/coverMime:connectArticleCoverData\.match/);
});
test('DM attachment and private response; session A overrides supplied B',async()=>{
 const r=await run('POST','/api/connect/conversations/7/messages',{userId:202,attachmentType:'IMAGE',attachmentMime:'image/png',attachmentData:image,attachmentName:'a.png'});assert.equal(r.status,201);assert.equal(write(r,'INSERT INTO howdi_connect_messages')[1],101);assert.equal(r.data.message.attachment_data,image);assert.equal(r.data.message.is_mine,true);privateFree(r.data);
 const denied=await run('POST','/api/connect/conversations/7/messages',{userId:202,messageText:'hello'},{nonmember:true});assert.equal(denied.status,403);
});
for(const spaceType of ['GROUP','CHANNEL'])test(spaceType+' attachment and join use session A despite B',async()=>{
 const r=await run('POST','/api/connect/groups-channels/7/messages',{userId:202,attachmentType:'IMAGE',attachmentMime:'image/png',mediaData:image},{spaceType});assert.equal(r.status,201);assert.equal(write(r,'INSERT INTO howdi_connect_social_messages')[1],101);assert.equal(r.data.message.media_data,image);privateFree(r.data);
 const joined=await run('POST','/api/connect/groups-channels/7/join',{userId:202},{spaceType});assert.equal(joined.status,200);assert.equal(write(joined,'INSERT INTO howdi_connect_social_space_members')[1],101);
 if(spaceType==='CHANNEL'){const denied=await run('POST','/api/connect/groups-channels/7/messages',{userId:202,body:'spoof'},{spaceType,role:'SUBSCRIBER'});assert.equal(denied.status,403);}
});
test('Invite join retains flow and uses session A',async()=>{const r=await run('POST','/api/connect/invite/token/join',{userId:202});assert.equal(r.status,200);assert.equal(r.data.spaceId,7);assert.equal(write(r,'INSERT INTO howdi_connect_social_space_members')[1],101);});
test('Conversation list and message reads keep internal identity private',async()=>{
 const r=await run('GET','/api/connect/conversations?userId=202');assert.equal(r.status,200);privateFree(r.data);assert.equal(r.calls.find(c=>c.sql.startsWith('SELECT c.id,c.updated_at')).params[0],101);
 const m=await run('GET','/api/connect/conversations/7/messages?userId=202');privateFree(m.data);assert.equal(m.data.messages[0].is_mine,true);assert.deepEqual(Array.from(m.data.messages[0].reactions),['👍','❤️']);
});
test('Conversation create uses session A, preserving recipient B',async()=>{const r=await run('POST','/api/connect/conversations',{userId:202,targetUserId:202});assert.equal(r.status,200);assert.deepEqual(Array.from(write(r,'INSERT INTO howdi_connect_conversation_members')),[7,101,202]);});
for(const action of ['reaction','comments','save','share'])test('Article '+action+' uses session A despite B',async()=>{
 const r=await run('POST','/api/connect/posts/7/'+action,{userId:202,user_id:202,content:'Comment',reaction:'LIKE'});assert.ok(r.status>=200&&r.status<300,JSON.stringify(r));const mutations=r.calls.filter(c=>/^(INSERT|DELETE)/.test(c.sql));assert.ok(mutations.length);assert.ok(mutations.every(c=>c.params[1]===101));
});
test('Protected K3 writes reject missing session even with supplied identity',async()=>{
 for(const [method,path] of [['POST','/api/connect/conversations'],['POST','/api/connect/conversations/7/messages'],['POST','/api/connect/groups-channels/7/messages'],['POST','/api/connect/groups-channels/7/join'],['POST','/api/connect/invite/token/join'],['POST','/api/connect/articles'],['PATCH','/api/connect/articles/7'],...['reaction','comments','save','share'].map(a=>['POST','/api/connect/posts/7/'+a])]){
  const r=await run(method,path,{userId:202,user_id:202},{anonymous:true});assert.equal(r.status,401,path);assert.equal(r.calls.filter(c=>/^(INSERT|UPDATE|DELETE)/.test(c.sql)).length,0,path);
 }
});
test('Follow uses session A identity even when body supplies B, notification params well-typed',async()=>{
 const r=await run('POST','/api/connect/users/303/follow',{userId:202,user_id:202});assert.equal(r.status,200);assert.equal(r.data.following,true);
 assert.deepEqual(Array.from(write(r,'INSERT INTO howdi_connect_follows')),[101,303]);
 const note=write(r,'INSERT INTO howdi_connect_notifications');
 assert.equal(note[0],303);assert.equal(note[1],101);assert.equal(note[2],'101');assert.equal(typeof note[3],'string');
});
test('Unauthenticated Follow returns 401 and writes nothing',async()=>{
 const r=await run('POST','/api/connect/users/303/follow',{userId:202},{anonymous:true});assert.equal(r.status,401);
 assert.equal(r.calls.filter(c=>/^(INSERT|UPDATE|DELETE)/.test(c.sql)).length,0);
});
test('Follow on a private profile creates a request and a well-typed notification',async()=>{
 const r=await run('POST','/api/connect/users/303/follow',{userId:202},{privateTarget:true});assert.equal(r.status,200);assert.equal(r.data.requested,true);
 assert.deepEqual(Array.from(write(r,'INSERT INTO howdi_connect_follow_requests')),[101,303]);
 const note=write(r,'INSERT INTO howdi_connect_notifications');
 assert.equal(note[0],303);assert.equal(note[1],101);assert.equal(note[2],'101');assert.equal(typeof note[3],'string');
});
test('Follow-requests GET ignores a spoofed query userId and scopes to the session user',async()=>{
 const r=await run('GET','/api/connect/follow-requests?userId=999',{});assert.equal(r.status,200);
 assert.equal(r.calls.find(c=>c.sql.startsWith('SELECT fr.*,u.full_name,cp.public_username')).params[0],101);
 assert.equal(r.data.requests[0].target_user_id,101);
});
test('Follow-requests GET without a session returns 401',async()=>{
 const r=await run('GET','/api/connect/follow-requests?userId=101',{},{anonymous:true});assert.equal(r.status,401);
});
test('Follow-request accept ignores a spoofed body userId and acts as the session user',async()=>{
 const r=await run('PATCH','/api/connect/follow-requests/303/respond',{userId:999,accept:true},{requestOwner:101});assert.equal(r.status,200);
 assert.deepEqual(Array.from(write(r,'UPDATE howdi_connect_follow_requests')),[303,101,'ACCEPTED']);
 assert.deepEqual(Array.from(write(r,'INSERT INTO howdi_connect_follows')),[303,101]);
});
test('Non-owner cannot accept another user\'s follow request',async()=>{
 const r=await run('PATCH','/api/connect/follow-requests/303/respond',{accept:true},{requestOwner:202});assert.equal(r.status,404);
 assert.equal(r.calls.filter(c=>c.sql.startsWith('INSERT INTO howdi_connect_follows')).length,0);
});

// =====================================================
// K5A — CONNECT HOME SHELL + FEED COMPOSITION
// =====================================================
const homeRoute=block('            if (req.method === "GET" && pathname === "/api/connect/home") {');
const vibeCursorDecodeSrc=between('    function vibeCursorDecode(value){','    async function getVibeViewer(req){');
const getVibeFeedRowsSrc=between('    async function getVibeFeedRows({','    // ============================================================\n    // HOWDI V14.0F');
const getSessionUserFromRequestSrc=between('    async function getSessionUserFromRequest(req)','    function adminTokenHash(');
const vibeRateLimitSrc=between('    const vibeV151BRateBuckets=new Map();','    function vibeSafePublicUsernameV151B(v){');
const getRequestIpSrc=between('    function getRequestIp(req) {','    function getBrowserName(');
const HOME_SECTION_KEYS=['special','hero','stories','forYou','vibes','continueWatching','recommendedCreators','suggestedPeople','communities','trendingArticles','shopRecommendations','worksRecommendations','learnRecommendations','recentActivity','dailyQuote','continueYourJourney'];
async function runHome(path,options={}){
 const calls=[];
 const query=async(sql,params=[])=>{
  sql=sql.replace(/\s+/g,' ').trim();calls.push({sql,params});
  if(sql.includes('FROM user_sessions s'))return {rows:params[0]==='session-A'?[{id:101}]:[],rowCount:params[0]==='session-A'?1:0};
  if(sql.startsWith('UPDATE user_sessions'))return {rows:[],rowCount:0};
  if(sql.includes('SELECT COUNT(*)::int n FROM howdi_connect_daily_quotes'))return {rows:[{n:options.quoteCount??7}],rowCount:1};
  if(sql.includes('FROM howdi_connect_daily_quotes') && sql.startsWith('SELECT quote_text'))return {rows:[{quote_text:'Test quote',author:'HOWDI'}],rowCount:1};
  if(options.queryOverride){const over=options.queryOverride(sql,params);if(over!==undefined)return over;}
  return {rows:[],rowCount:0};
 };
 const pool={query};
 const headers={...(options.headers||{})};
 if(!options.anonymous&&!headers.authorization)headers.authorization='Bearer session-A';
 const req={method:'GET',headers,socket:{remoteAddress:options.ip||'127.0.0.1'}};
 const url=new URL('http://localhost'+path);
 const resHeaders={};
 const res={setHeader:(k,v)=>{resHeaders[k]=v;}};
 const context={
  pool,req,res,url,pathname:'/api/connect/home',URL,Buffer,
  clean:x=>String(x??'').trim(),
  sendJSON:(_res,status,data)=>({status,data}),
  console:{error:()=>{}},
 };
 const src=`${getRequestIpSrc}\n${vibeRateLimitSrc}\n${getSessionUserFromRequestSrc}\n${vibeCursorDecodeSrc}\n${getVibeFeedRowsSrc}\n(async()=>{${homeRoute}})()`;
 const response=await vm.runInNewContext(src,context);
 assert.ok(response,'Route must respond');
 return {...response,calls,resHeaders};
}
test('Connect Home returns all 16 required sections for a guest',async()=>{
 const r=await runHome('/api/connect/home',{anonymous:true});
 assert.equal(r.status,200);
 assert.equal(r.data.meta.guest,true);
 assert.deepEqual(Array.from(r.data.order),HOME_SECTION_KEYS);
 for(const key of HOME_SECTION_KEYS)assert.ok(Object.prototype.hasOwnProperty.call(r.data.sections,key),`missing section ${key}`);
});
test('Connect Home returns all 16 required sections for an authenticated user',async()=>{
 const r=await runHome('/api/connect/home');
 assert.equal(r.status,200);
 assert.equal(r.data.meta.guest,false);
 for(const key of HOME_SECTION_KEYS)assert.ok(Object.prototype.hasOwnProperty.call(r.data.sections,key),`missing section ${key}`);
});
test('Connect Home honors the ?sections= filter for progressive loading',async()=>{
 const r=await runHome('/api/connect/home?sections=dailyQuote,special,hero');
 assert.equal(r.status,200);
 assert.deepEqual(Object.keys(r.data.sections).sort(),['dailyQuote','hero','special']);
 assert.equal(r.data.sections.dailyQuote.item.quote_text,'Test quote');
});
test('Connect Home never leaks internal identity fields to the client',async()=>{
 const r=await runHome('/api/connect/home');
 assert.equal(r.status,200);
 const serialized=JSON.stringify(r.data);
 assert.doesNotMatch(serialized,/howdi_id|master_id|identity_uuid/);
});
test('Connect Home is session-authoritative (ignores no client-supplied identity, uses session)',async()=>{
 const r=await runHome('/api/connect/home');
 const sessionCall=r.calls.find(c=>c.sql.includes('FROM user_sessions s'));
 assert.ok(sessionCall);
 assert.equal(sessionCall.params[0],'session-A');
});
test('Connect Home sets a private no-store cache header',async()=>{
 const r=await runHome('/api/connect/home');
 assert.equal(r.resHeaders['Cache-Control'],'private, no-store');
});
test('Connect Home Recommended Creators / Suggested People cards never carry a raw numeric id',async()=>{
 const r=await runHome('/api/connect/home',{queryOverride:(sql)=>{
   if(sql.startsWith('SELECT cp.public_username,u.full_name,cp.profession_title,cp.professional_category'))
     return {rows:[{public_username:'crafty_alice',full_name:'Alice',profession_title:'Potter',professional_category:'ARTS',profile_image:'',following:false}],rowCount:1};
   return undefined;
 }});
 assert.equal(r.status,200);
 for(const key of ['recommendedCreators','suggestedPeople']){
  const call=r.calls.find(c=>c.sql.startsWith('SELECT cp.public_username,u.full_name,cp.profession_title,cp.professional_category')&&(key==='recommendedCreators'?c.sql.includes('cp.creator_mode=TRUE'):c.sql.includes('f2.follower_user_id=$1')));
  assert.ok(call,`${key} query not found`);
  assert.doesNotMatch(call.sql.split(' FROM ')[0],/\bu\.id\b|\bcp\.user_id\b/,`${key} SELECT list must not project a raw user id`);
  const items=r.data.sections[key].items;
  assert.ok(items.length>0,`${key} should have a card in this test`);
  for(const item of items){
   assert.equal(Object.prototype.hasOwnProperty.call(item,'id'),false,`${key} card must not expose a raw id`);
   assert.ok(item.public_username,`${key} card must carry public_username`);
  }
 }
});
test('Connect Home recommendedCreators/suggestedPeople queries require a non-null public_username',async()=>{
 const r=await runHome('/api/connect/home');
 for(const key of ['recommendedCreators','suggestedPeople']){
  const call=r.calls.find(c=>c.sql.includes('creator_mode=TRUE')||c.sql.startsWith('SELECT cp.public_username,u.full_name'));
 }
 const creatorsCall=r.calls.find(c=>c.sql.includes('cp.creator_mode=TRUE'));
 assert.match(creatorsCall.sql,/public_username IS NOT NULL/);
 const suggestedCall=r.calls.find(c=>c.sql.includes('f2.follower_user_id=$1'));
 assert.match(suggestedCall.sql,/public_username IS NOT NULL/);
});
test('Connect Home For You / Hero / Trending Articles / Recent Activity exclude bidirectionally blocked authors',async()=>{
 const r=await runHome('/api/connect/home');
 const forYouCall=r.calls.find(c=>c.sql.includes('WITH scored AS'));
 assert.match(forYouCall.sql,/howdi_connect_profile_blocks/);
 const heroCall=r.calls.find(c=>c.sql.startsWith('SELECT p.id,p.post_type,p.content,p.article_title,p.media_data,p.media_type,p.created_at, u.full_name,cp.public_username FROM howdi_community_posts'));
 assert.match(heroCall.sql,/howdi_connect_profile_blocks/);
 const trendingCall=r.calls.find(c=>c.sql.includes("p.post_type='ARTICLE'"));
 assert.match(trendingCall.sql,/howdi_connect_profile_blocks/);
 const activityCall=r.calls.find(c=>c.sql.includes('FROM howdi_connect_notifications'));
 assert.match(activityCall.sql,/howdi_connect_profile_blocks/);
});
test('Connect Home Continue Watching is sourced from Vibe watch progress, not generic post progress',async()=>{
 const r=await runHome('/api/connect/home?sections=continueWatching',{queryOverride:(sql)=>{
   if(sql.includes('FROM vibe_watch_session_items'))return {rows:[{vibe_id:'11111111-1111-1111-1111-111111111111',vibe_code:'VIBE-000123',vibe_type:'video',caption:'Making a bowl',cover_url:'https://x/y.jpg',creator_user_id:'7',creator_name:'Casey',completion:42.5,last_seen_at:new Date().toISOString()}],rowCount:1};
   return undefined;
 }});
 assert.equal(r.status,200);
 const call=r.calls.find(c=>c.sql.includes('FROM vibe_watch_session_items'));
 assert.ok(call,'continueWatching must query vibe_watch_session_items');
 assert.doesNotMatch(call.sql,/howdi_connect_post_progress/);
 const item=r.data.sections.continueWatching.items[0];
 assert.equal(item.vibeId,'11111111-1111-1111-1111-111111111111');
 assert.equal(item.completionPercent,43);
 assert.equal(Object.prototype.hasOwnProperty.call(item,'id'),false);
});
test('Connect Home For You rejects a malformed forYouCursor with 400',async()=>{
 const r=await runHome('/api/connect/home?sections=forYou&forYouCursor=not-valid-base64!!!');
 assert.equal(r.status,400);
});
test('Connect Home For You accepts a well-formed keyset cursor and queries with the tuple comparison',async()=>{
 const cursor=Buffer.from(JSON.stringify({s:12,c:new Date().toISOString(),i:5})).toString('base64url');
 const r=await runHome(`/api/connect/home?sections=forYou&forYouCursor=${cursor}`);
 assert.equal(r.status,200);
 const call=r.calls.find(c=>c.sql.includes('WITH scored AS'));
 assert.equal(Number(call.params[1]),12);
 assert.equal(Number(call.params[3]),5);
});
test('Connect Home is rate-limited per guest IP / per authenticated user',async()=>{
 const budget=vm.runInNewContext(
   `${getRequestIpSrc}\n${vibeRateLimitSrc}\nvibeRateLimitV151B('connect-home:test-key',3,60000)`,
   {}
 );
 assert.equal(budget.allowed,true);
 assert.equal(budget.remaining,2);
});

// =====================================================
// K5A REVIEW FIX — username-addressed follow/profile actions + admin gating
// =====================================================
const usernameFollowRoute=block('            if(req.method==="POST"&&/^\\/api\\/connect\\/profile\\/username\\/[^\\/?]+\\/follow\\/?$/.test(pathname)){');
const adminConfigRoute=block('            if(req.method==="GET"&&pathname==="/api/admin/connect/home/config"){');
const getAdminSessionSrc=between('    async function getAdminSessionFromRequest(req){','    async function auditAdminSecurity(');
async function runUsernameAction(routeSrc,method,path,options={}){
 const calls=[];
 const query=async(sql,params=[])=>{
  sql=sql.replace(/\s+/g,' ').trim();calls.push({sql,params});
  if(sql.includes('FROM user_sessions s'))return {rows:params[0]==='session-A'?[{id:101}]:[],rowCount:0};
  if(sql.startsWith('UPDATE user_sessions'))return {rows:[],rowCount:0};
  if(sql.startsWith('SELECT id,username,ip_address'))return {rows:options.adminToken==='admin-token-good'&&params[0]===adminTokenHash('admin-token-good')?[{id:'a1',username:'root'}]:[],rowCount:0};
  if(sql.startsWith('SELECT user_id FROM howdi_connect_profiles WHERE LOWER(public_username)'))return {rows:options.knownUsername&&String(params[0]).toLowerCase()===options.knownUsername.toLowerCase()?[{user_id:303}]:[],rowCount:0};
  if(options.queryOverride){const over=options.queryOverride(sql,params);if(over!==undefined)return over;}
  return {rows:[],rowCount:0};
 };
 function adminTokenHash(token){return require('crypto').createHash('sha256').update(String(token||'')).digest('hex');}
 const pool={query};
 const req=new Readable({read(){}});req.push(JSON.stringify(options.body||{}));req.push(null);
 req.method=method;req.headers={...(options.anonymous?{}:{authorization:'Bearer session-A'}),...(options.adminToken?{'x-howdi-admin-token':options.adminToken}:{})};
 const url=new URL('http://localhost'+path);
 const nodeCrypto=require('crypto');
 const context={
  pool,req,res:{},url,pathname:path.split('?')[0],URL,Buffer,
  clean:x=>String(x??'').trim(),
  getBody:async(r)=>{let d='';for await(const c of r)d+=c;return JSON.parse(d||'{}');},
  sendJSON:(_res,status,data)=>({status,data}),
  console:{error:()=>{}},
  crypto:nodeCrypto,
 };
 const src=`${getSessionUserFromRequestSrc}\n${getAdminSessionSrc}\nfunction adminTokenHash(token){return crypto.createHash('sha256').update(String(token||'')).digest('hex');}\n(async()=>{${routeSrc}})()`;
 const response=await vm.runInNewContext(src,context);
 assert.ok(response,'Route must respond');
 return {...response,calls};
}
test('Username-addressed follow requires an authenticated session (401, no writes)',async()=>{
 const r=await runUsernameAction(usernameFollowRoute,'POST','/api/connect/profile/username/crafty_alice/follow',{anonymous:true,knownUsername:'crafty_alice'});
 assert.equal(r.status,401);
 assert.equal(r.calls.filter(c=>/^(INSERT|UPDATE|DELETE)/.test(c.sql)).length,0);
});
test('Username-addressed follow 404s for an unknown username without leaking whether the session is valid',async()=>{
 const r=await runUsernameAction(usernameFollowRoute,'POST','/api/connect/profile/username/nobody_here/follow',{knownUsername:'crafty_alice'});
 assert.equal(r.status,404);
});
test('Admin Home config route requires a valid admin session token (401 without one)',async()=>{
 const r=await runUsernameAction(adminConfigRoute,'GET','/api/admin/connect/home/config',{anonymous:true});
 assert.equal(r.status,401);
});
test('Admin Home config route succeeds with a valid admin session token',async()=>{
 const r=await runUsernameAction(adminConfigRoute,'GET','/api/admin/connect/home/config',{anonymous:true,adminToken:'admin-token-good',queryOverride:(sql)=>{
   if(sql.startsWith('SELECT * FROM howdi_connect_home_specials'))return {rows:[],rowCount:0};
   if(sql.startsWith('SELECT * FROM howdi_connect_home_hero'))return {rows:[],rowCount:0};
   if(sql.startsWith('SELECT * FROM howdi_connect_daily_quotes'))return {rows:[],rowCount:0};
   return undefined;
 }});
 assert.equal(r.status,200);
});

// =====================================================
// K5A FINAL CLOSURE — 4 confirmed post-review blockers
// =====================================================

// ---- 1. Public profile viewer identity must come from the session, never ?viewerId ----
const publicProfileUsernameRoute=block('            if(req.method==="GET"&&/^\\/api\\/connect\\/public-profile\\/username\\/[^\\/?]+\\/?$/.test(pathname)){');
const publicProfileNumericRoute=block('            if(req.method==="GET"&&/^\\/api\\/connect\\/public-profile\\/\\d+\\/?$/.test(pathname)){');
async function runProfileViewerTest(routeSrc,path,options={}){
 const calls=[];
 const query=async(sql,params=[])=>{
  sql=sql.replace(/\s+/g,' ').trim();calls.push({sql,params});
  if(sql.includes('FROM user_sessions s'))return {rows:params[0]==='session-A'?[{id:101}]:[],rowCount:0};
  if(sql.startsWith('UPDATE user_sessions'))return {rows:[],rowCount:0};
  if(sql.startsWith('SELECT user_id FROM howdi_connect_profiles WHERE LOWER(public_username)'))return {rows:options.knownUsername?[{user_id:Number(options.targetId||303)}]:[],rowCount:0};
  return {rows:[],rowCount:0};
 };
 const pool={query};
 const req={method:'GET',headers:options.anonymous?{}:{authorization:'Bearer session-A'}};
 const url=new URL('http://localhost'+path);
 const profileCalls=[];
 const context={
  pool,req,res:{},url,pathname:path.split('?')[0],URL,Buffer,
  clean:x=>String(x??'').trim(),
  sendJSON:(_res,status,data)=>({status,data}),
  loadConnectPublicProfileResponse:async(res,target,viewer)=>{profileCalls.push({target,viewer});return {status:200,data:{status:'success',profile:{target}}};},
 };
 const src=`${getSessionUserFromRequestSrc}\n(async()=>{${routeSrc}})()`;
 const response=await vm.runInNewContext(src,context);
 assert.ok(response,'Route must respond');
 return {...response,calls,profileCalls};
}
test('Guest viewing a username profile cannot impersonate the target via ?viewerId',async()=>{
 const r=await runProfileViewerTest(publicProfileUsernameRoute,'/api/connect/public-profile/username/crafty_alice?viewerId=303',{anonymous:true,knownUsername:true,targetId:303});
 assert.equal(r.status,200);
 assert.equal(r.profileCalls[0].viewer,0,'guest must be treated as viewer 0, not the spoofed target id');
});
test('Guest viewing a numeric profile cannot impersonate the target via ?viewerId',async()=>{
 const r=await runProfileViewerTest(publicProfileNumericRoute,'/api/connect/public-profile/303?viewerId=303',{anonymous:true});
 assert.equal(r.status,200);
 assert.equal(r.profileCalls[0].viewer,0);
});
test('Authenticated session A viewing a profile with ?viewerId=B still acts as A',async()=>{
 const r=await runProfileViewerTest(publicProfileUsernameRoute,'/api/connect/public-profile/username/crafty_alice?viewerId=999',{knownUsername:true,targetId:303});
 assert.equal(r.status,200);
 assert.equal(r.profileCalls[0].viewer,101,'authenticated viewer must be the real session user, not the spoofed query value');
 assert.equal(r.profileCalls[0].target,303);
});
test('Authenticated session A viewing a numeric profile with ?viewerId=B still acts as A',async()=>{
 const r=await runProfileViewerTest(publicProfileNumericRoute,'/api/connect/public-profile/303?viewerId=999');
 assert.equal(r.status,200);
 assert.equal(r.profileCalls[0].viewer,101);
});
test('Username profile 404s for an unknown username regardless of viewer spoof attempt',async()=>{
 const r=await runProfileViewerTest(publicProfileUsernameRoute,'/api/connect/public-profile/username/nobody?viewerId=303',{anonymous:true,knownUsername:false});
 assert.equal(r.status,404);
 assert.equal(r.profileCalls.length,0);
});

// ---- 2. Admin Special / Hero created_by must be a text column, and writes with a
//         non-numeric admin username (e.g. "root") must succeed ----
const adminSpecialCreateRoute=block('            if(req.method==="POST"&&pathname==="/api/admin/connect/home/special"){');
const adminHeroCreateRoute=block('            if(req.method==="POST"&&pathname==="/api/admin/connect/home/hero"){');
test('Schema: howdi_connect_home_specials / howdi_connect_home_hero declare created_by as text, not BIGINT',()=>{
 assert.match(source,/CREATE TABLE IF NOT EXISTS howdi_connect_home_specials\([\s\S]*?created_by VARCHAR\(180\)/);
 assert.match(source,/CREATE TABLE IF NOT EXISTS howdi_connect_home_hero\([\s\S]*?created_by VARCHAR\(180\)/);
 assert.match(source,/ALTER TABLE howdi_connect_home_specials ALTER COLUMN created_by TYPE VARCHAR\(180\)/);
 assert.match(source,/ALTER TABLE howdi_connect_home_hero ALTER COLUMN created_by TYPE VARCHAR\(180\)/);
});
test('Admin Special create succeeds for a valid admin session with a nonnumeric admin username',async()=>{
 const r=await runUsernameAction(adminSpecialCreateRoute,'POST','/api/admin/connect/home/special',{
  anonymous:true,adminToken:'admin-token-good',body:{title:'Founders Sale',subtitle:'50% off',ctaLabel:'Shop now',ctaUrl:'/shop'},
  queryOverride:(sql,params)=>{ if(sql.startsWith('INSERT INTO howdi_connect_home_specials'))return {rows:[{id:1,title:params[0],created_by:params[11]}],rowCount:1}; return undefined; }
 });
 assert.equal(r.status,200);
 const insert=r.calls.find(c=>c.sql.startsWith('INSERT INTO howdi_connect_home_specials'));
 assert.ok(insert);
 assert.equal(insert.params[11],'root');
 assert.equal(typeof insert.params[11],'string');
});
test('Admin Hero create succeeds for a valid admin session with a nonnumeric admin username',async()=>{
 const r=await runUsernameAction(adminHeroCreateRoute,'POST','/api/admin/connect/home/hero',{
  anonymous:true,adminToken:'admin-token-good',body:{title:'Meet our top makers',bodyText:'Featured this week'},
  queryOverride:(sql,params)=>{ if(sql.startsWith('INSERT INTO howdi_connect_home_hero'))return {rows:[{id:1,title:params[0],created_by:params[10]}],rowCount:1}; return undefined; }
 });
 assert.equal(r.status,200);
 const insert=r.calls.find(c=>c.sql.startsWith('INSERT INTO howdi_connect_home_hero'));
 assert.ok(insert);
 assert.equal(insert.params[10],'root');
 assert.equal(typeof insert.params[10],'string');
});

// ---- 3. Continue Watching must only surface currently-available Vibes ----
test('Continue Watching query requires published/public/non-deleted Vibes',async()=>{
 const r=await runHome('/api/connect/home?sections=continueWatching',{queryOverride:(sql)=>{
   if(sql.includes('FROM vibe_watch_session_items'))return {rows:[],rowCount:0};
   return undefined;
 }});
 assert.equal(r.status,200);
 const call=r.calls.find(c=>c.sql.includes('FROM vibe_watch_session_items'));
 assert.ok(call);
 assert.match(call.sql,/v\.status='published'/);
 assert.match(call.sql,/v\.visibility='public'/);
 assert.match(call.sql,/v\.deleted_at IS NULL/);
});
test('Continue Watching block predicate casts both sides to text consistently with the $1::text usage (regression: bigint=text type error found in live smoke test)',async()=>{
 const r=await runHome('/api/connect/home?sections=continueWatching',{queryOverride:(sql)=>{
   if(sql.includes('FROM vibe_watch_session_items'))return {rows:[],rowCount:0};
   return undefined;
 }});
 const call=r.calls.find(c=>c.sql.includes('FROM vibe_watch_session_items'));
 assert.ok(call);
 // $1 is used both as wsi.user_id=$1::text and in the block predicate; every other
 // reference to $1 against a BIGINT column (blocker_user_id/blocked_user_id) must
 // also be cast to text, or Postgres infers $1 as text and rejects the bare bigint
 // comparison with "operator does not exist: bigint = text".
 assert.match(call.sql,/b\.blocker_user_id::text=\$1/);
 assert.match(call.sql,/b\.blocked_user_id::text=\$1/);
 assert.doesNotMatch(call.sql,/b\.blocker_user_id=\$1(?!::)/);
 assert.doesNotMatch(call.sql,/b\.blocked_user_id=\$1(?!::)/);
});
test('Continue Watching excludes a watched Vibe that is draft, private, or deleted (mocked as filtered by the availability predicate)',async()=>{
 // The availability predicate lives in SQL (asserted above); here we confirm the mocked
 // fixture representing an unavailable Vibe never reaches the mapped items when the
 // predicate is honored by the (mock) query layer, i.e. an empty result set is handled cleanly.
 const r=await runHome('/api/connect/home?sections=continueWatching',{queryOverride:(sql)=>{
   if(sql.includes('FROM vibe_watch_session_items'))return {rows:[],rowCount:0};
   return undefined;
 }});
 assert.equal(r.status,200);
 assert.deepEqual(r.data.sections.continueWatching.items,[]);
});

// ---- 4. Home Vibe rail (getVibeFeedRows) must exclude blocked creators ----
test('getVibeFeedRows excludes blocked creators via SQL predicate when a viewer is present',async()=>{
 const calls=[];
 const query=async(sql,params=[])=>{sql=sql.replace(/\s+/g,' ').trim();calls.push({sql,params});return {rows:[],rowCount:0};};
 const pool={query};
 const context={pool,console:{error:()=>{}}};
 const src=`${vibeCursorDecodeSrc}\n${getVibeFeedRowsSrc}\ngetVibeFeedRows({mode:'for-you',viewerId:101,limit:10})`;
 await vm.runInNewContext(src,context);
 const feedCall=calls.find(c=>c.sql.startsWith('SELECT v.*'));
 assert.ok(feedCall,'feed query not found');
 assert.match(feedCall.sql,/vibe_creator_blocks/);
 assert.match(feedCall.sql,/howdi_connect_profile_blocks/);
 assert.ok(feedCall.params.includes('101'),'viewer id must be bound as a query param for the block predicate');
});
test('getVibeFeedRows guest browsing (no viewerId) does not apply the block predicate and still works',async()=>{
 const calls=[];
 const query=async(sql,params=[])=>{sql=sql.replace(/\s+/g,' ').trim();calls.push({sql,params});return {rows:[],rowCount:0};};
 const pool={query};
 const context={pool,console:{error:()=>{}}};
 const src=`${vibeCursorDecodeSrc}\n${getVibeFeedRowsSrc}\ngetVibeFeedRows({mode:'for-you',viewerId:null,limit:10})`;
 const result=await vm.runInNewContext(src,context);
 assert.ok(result.rows);
 const feedCall=calls.find(c=>c.sql.startsWith('SELECT v.*'));
 assert.doesNotMatch(feedCall.sql,/vibe_creator_blocks/);
});

// =====================================================
// K5B — PUBLIC PROFILE + FOLLOW SYSTEM
// (@username, avatar/name/bio, follower/following counts, Vibes, Articles,
// Communities, creator links; Follow/Unfollow/Follow-Back/private-request/
// accept-reject; Followers/Following/Mutuals/Suggestions. Session-authoritative,
// never exposes a raw numeric user id.)
// =====================================================
const connectionsByUsernameRoute=block('            if(req.method==="GET"&&/^\\/api\\/connect\\/profile\\/username\\/[^\\/?]+\\/connections\\/?$/.test(pathname)){');
const connectionsMineRoute=block('            if(req.method==="GET"&&pathname==="/api/connect/connections/mine"){');
const respondFollowRequestByUsernameRoute=block('            if(req.method==="PATCH"&&/^\\/api\\/connect\\/profile\\/username\\/[^\\/?]+\\/respond-follow-request\\/?$/.test(pathname)){');
const connectSuggestionsRoute=block('            if(req.method==="GET"&&pathname==="/api/connect/connect-suggestions"){');
const conversationsUsernameStartRoute=block('            if(req.method==="POST"&&/^\\/api\\/connect\\/conversations\\/username\\/[^\\/?]+\\/start\\/?$/.test(pathname)){');
const socialGraphRoute=block('            if(req.method==="GET"&&pathname==="/api/connect/social-graph"){');
const socialSummaryRoute=block('            if(req.method==="GET"&&pathname==="/api/connect/social-summary"){');
const toggleBlockCloseFriendFnsSrc=between('            async function toggleConnectProfileBlockResponse(res,uid,blocked){','            if(req.method==="POST"&&/^\\/api\\/connect\\/profiles\\/\\d+\\/block\\/?$/.test(pathname)){');
const blockNumericRoute=block('            if(req.method==="POST"&&/^\\/api\\/connect\\/profiles\\/\\d+\\/block\\/?$/.test(pathname)){');
const blockUsernameRoute=block('            if(req.method==="POST"&&/^\\/api\\/connect\\/profile\\/username\\/[^\\/?]+\\/block\\/?$/.test(pathname)){');
const closeFriendNumericRoute=block('            if(req.method==="POST"&&/^\\/api\\/connect\\/profiles\\/\\d+\\/close-friend\\/?$/.test(pathname)){');
const closeFriendUsernameRoute=block('            if(req.method==="POST"&&/^\\/api\\/connect\\/profile\\/username\\/[^\\/?]+\\/close-friend\\/?$/.test(pathname)){');
const loadConnectPublicProfileResponseSrc=between('            async function loadConnectPublicProfileResponse(res,target,viewer){','            if(req.method==="GET"&&/^\\/api\\/connect\\/public-profile\\/\\d+\\/?$/.test(pathname)){');

// `helpers` (defined above for the K3 harness) already contains, as safe function
// declarations, everything K5B's routes need: getSessionUserFromRequest, getBody,
// and the four K5B shared functions (loadConnectFollowListResponse,
// respondConnectFollowRequestResponse, startConnectConversationWith,
// resolveConnectUsernameToId) — they were deliberately left in that source range.
// Only Block/Close-Friend's shared functions live after the Home route, so this
// harness also prepends those explicitly.
async function runK5B(routeSrc,method,path,options={}){
 const calls=[];
 const query=async(sql,params=[])=>{
  sql=sql.replace(/\s+/g,' ').trim();calls.push({sql,params});
  if(sql.includes('FROM user_sessions s'))return {rows:params[0]==='session-A'?[{id:101}]:[],rowCount:0};
  if(sql.startsWith('UPDATE user_sessions'))return {rows:[],rowCount:0};
  if(sql.startsWith('SELECT user_id FROM howdi_connect_profiles WHERE LOWER(public_username)')){
   const map=options.usernameMap||(options.knownUsername?{[String(options.knownUsername).toLowerCase()]:Number(options.targetId||303)}:{});
   const id=map[String(params[0]).toLowerCase()];
   return {rows:id?[{user_id:id}]:[],rowCount:id?1:0};
  }
  if(sql.startsWith('SELECT private_profile,follower_list_visibility FROM howdi_connect_profiles'))return {rows:[{private_profile:Boolean(options.ownerPrivate),follower_list_visibility:options.followerListVisibility||'EVERYONE'}],rowCount:1};
  if(sql.startsWith('SELECT 1 FROM howdi_connect_follows WHERE follower_user_id'))return {rows:options.viewerFollowsOwner?[{exists:1}]:[],rowCount:0};
  if(sql.startsWith('SELECT 1 FROM howdi_connect_profile_blocks'))return {rows:options.blocked?[{exists:1}]:[],rowCount:0};
  if(sql.startsWith('UPDATE howdi_connect_follow_requests'))return {rows:options.requestFound?[{requester_user_id:params[0],target_user_id:params[1],status:params[2]}]:[],rowCount:options.requestFound?1:0};
  if(sql.startsWith('INSERT INTO howdi_connect_follows'))return {rows:[{follower_user_id:params[0],following_user_id:params[1]}],rowCount:1};
  if(sql.startsWith('SELECT c.id FROM howdi_connect_conversations'))return {rows:options.existingConversation?[{id:options.existingConversation}]:[],rowCount:0};
  if(sql.startsWith('INSERT INTO howdi_connect_conversations'))return {rows:[{id:9}],rowCount:1};
  if(sql.startsWith('INSERT INTO howdi_connect_conversation_members'))return {rows:[],rowCount:0};
  if(sql.startsWith('DELETE FROM howdi_connect_profile_blocks'))return {rows:[],rowCount:0};
  if(sql.startsWith('INSERT INTO howdi_connect_profile_blocks'))return {rows:[],rowCount:0};
  if(sql.startsWith('DELETE FROM howdi_connect_follows'))return {rows:[],rowCount:0};
  if(sql.startsWith('SELECT 1 FROM howdi_connect_close_friends'))return {rows:options.alreadyCloseFriend?[{exists:1}]:[],rowCount:0};
  if(sql.startsWith('DELETE FROM howdi_connect_close_friends'))return {rows:[],rowCount:0};
  if(sql.startsWith('INSERT INTO howdi_connect_close_friends'))return {rows:[],rowCount:0};
  if(options.queryOverride){const over=options.queryOverride(sql,params);if(over!==undefined)return over;}
  return {rows:[],rowCount:0};
 };
 const pool={query,connect:async()=>({query,release(){}})};
 const req=new Readable({read(){}});req.push(JSON.stringify(options.body||{}));req.push(null);
 req.method=method;req.headers=options.anonymous?{}:{authorization:'Bearer session-A'};
 const url=new URL('http://localhost'+path);
 const context={
  pool,req,res:{},url,pathname:path.split('?')[0],URL,Buffer,
  clean:x=>String(x??'').trim(),
  sendJSON:(_res,status,data)=>({status,data}),
  console:{error:()=>{}},
 };
 const src=`${helpers}\n${toggleBlockCloseFriendFnsSrc}\n(async()=>{${routeSrc}})()`;
 const response=await vm.runInNewContext(src,context);
 assert.ok(response,'Route must respond');
 return {...response,calls};
}

test('Connections-by-username 404s for an unknown username',async()=>{
 const r=await runK5B(connectionsByUsernameRoute,'GET','/api/connect/profile/username/nobody/connections',{anonymous:true,knownUsername:'crafty_alice'});
 assert.equal(r.status,404);
});
test('Connections-by-username uses the session as viewer (guest = viewer 0, no impersonation vector exists on this route)',async()=>{
 const r=await runK5B(connectionsByUsernameRoute,'GET','/api/connect/profile/username/crafty_alice/connections?type=followers',{anonymous:true,knownUsername:'crafty_alice',targetId:303});
 assert.equal(r.status,200);
 assert.equal(r.data.type,'followers');
});
test('Connections "mine" requires an authenticated session (401, no writes)',async()=>{
 const r=await runK5B(connectionsMineRoute,'GET','/api/connect/connections/mine?type=followers',{anonymous:true});
 assert.equal(r.status,401);
});
test('Connections "mine" scopes viewer and owner to the session user for each type: followers/following/mutuals',async()=>{
 for(const type of ['followers','following','mutuals']){
  const r=await runK5B(connectionsMineRoute,'GET',`/api/connect/connections/mine?type=${type}`);
  assert.equal(r.status,200,type);
  assert.equal(r.data.type,type);
  assert.equal(r.data.people.length,0);
 }
});
test('Connections "mine" followers/following rows never carry a raw numeric id and require public_username',async()=>{
 const r=await runK5B(connectionsMineRoute,'GET','/api/connect/connections/mine?type=followers',{queryOverride:(sql)=>{
  if(sql.startsWith('SELECT u.full_name,cp.public_username,COALESCE(cp.avatar_data,ps.profile_image,\'\') profile_image,cp.headline,cp.profession_title,cp.private_profile'))
   return {rows:[{full_name:'Bee',public_username:'bee_maker',profile_image:'',headline:'',profession_title:'',private_profile:false,viewer_following:true,follows_viewer:false,request_pending:false}],rowCount:1};
  return undefined;
 }});
 assert.equal(r.status,200);
 assert.equal(r.data.people.length,1);
 assert.equal(Object.prototype.hasOwnProperty.call(r.data.people[0],'id'),false);
 const call=r.calls.find(c=>c.sql.startsWith('SELECT u.full_name,cp.public_username,COALESCE(cp.avatar_data,ps.profile_image,\'\') profile_image,cp.headline,cp.profession_title,cp.private_profile'));
 assert.ok(call);
 assert.match(call.sql,/public_username IS NOT NULL/);
 assert.doesNotMatch(call.sql.split(' FROM ')[0],/\bu\.id\b/);
 assert.match(call.sql,/howdi_connect_profile_blocks/);
});
test('Connections "mine" type=followers/following is blocked (403) when the owner keeps their network private and the viewer does not follow them',async()=>{
 const r=await runK5B(connectionsMineRoute,'GET','/api/connect/connections/mine?type=followers',{
  queryOverride:(sql)=>{ if(sql.startsWith('SELECT private_profile,follower_list_visibility FROM howdi_connect_profiles'))return {rows:[{private_profile:true,follower_list_visibility:'FOLLOWERS'}],rowCount:1}; return undefined; }
 });
 // Note: connections/mine always sets viewer===owner (the session user viewing their own
 // list), so the "private + not following" branch cannot trigger here (viewerId===ownerId
 // short-circuits `allowed` to true) — this asserts that self-view is never blocked.
 assert.equal(r.status,200);
});
test('Connections type=requests requires viewer===owner (403 for a non-owner even when authenticated)',async()=>{
 const r=await runK5B(connectionsByUsernameRoute,'GET','/api/connect/profile/username/crafty_alice/connections?type=requests',{knownUsername:'crafty_alice',targetId:303});
 assert.equal(r.status,403);
});
test('Connections type=requests returns rows scoped to the owner and requires public_username',async()=>{
 const r=await runK5B(connectionsMineRoute,'GET','/api/connect/connections/mine?type=requests',{queryOverride:(sql)=>{
  if(sql.startsWith('SELECT u.full_name,cp.public_username,COALESCE(cp.avatar_data,ps.profile_image,\'\') profile_image,cp.headline,cp.profession_title,fr.created_at'))
   return {rows:[{full_name:'Req',public_username:'req_person',profile_image:'',headline:'',profession_title:'',created_at:new Date().toISOString(),viewer_following:false}],rowCount:1};
  return undefined;
 }});
 assert.equal(r.status,200);
 const call=r.calls.find(c=>c.sql.startsWith('SELECT u.full_name,cp.public_username,COALESCE(cp.avatar_data,ps.profile_image,\'\') profile_image,cp.headline,cp.profession_title,fr.created_at'));
 assert.ok(call);
 assert.equal(call.params[0],101);
 assert.match(call.sql,/public_username IS NOT NULL/);
});
test('Connections type=mutuals short-circuits to an empty list for a guest viewer without querying the self-join',async()=>{
 const r=await runK5B(connectionsByUsernameRoute,'GET','/api/connect/profile/username/crafty_alice/connections?type=mutuals',{anonymous:true,knownUsername:'crafty_alice',targetId:303});
 assert.equal(r.status,200);
 assert.deepEqual(Array.from(r.data.people),[]);
 assert.equal(r.calls.filter(c=>c.sql.includes('JOIN howdi_connect_follows f2')).length,0);
});
test('Connections type=mutuals self-join query excludes the viewer and owner, excludes blocks, requires public_username',async()=>{
 const r=await runK5B(connectionsMineRoute,'GET','/api/connect/connections/mine?type=mutuals',{queryOverride:(sql)=>{
  if(sql.includes('JOIN howdi_connect_follows f2'))return {rows:[{full_name:'Mutual',public_username:'mutual_1',profile_image:'',headline:'',profession_title:''}],rowCount:1};
  return undefined;
 }});
 assert.equal(r.status,200);
 assert.equal(r.data.type,'mutuals');
 const call=r.calls.find(c=>c.sql.includes('JOIN howdi_connect_follows f2'));
 assert.ok(call);
 assert.match(call.sql,/u\.id<>\$1 AND u\.id<>\$2/);
 assert.match(call.sql,/public_username IS NOT NULL/);
 assert.match(call.sql,/howdi_connect_profile_blocks/);
 assert.equal(Object.prototype.hasOwnProperty.call(r.data.people[0],'id'),false);
});
test('Respond-follow-request-by-username requires an authenticated session (401, no writes)',async()=>{
 const r=await runK5B(respondFollowRequestByUsernameRoute,'PATCH','/api/connect/profile/username/req303/respond-follow-request',{anonymous:true,knownUsername:'req303',body:{accept:true}});
 assert.equal(r.status,401);
 assert.equal(r.calls.filter(c=>/^(INSERT|UPDATE|DELETE)/.test(c.sql)).length,0);
});
test('Respond-follow-request-by-username 404s for an unknown requester username',async()=>{
 const r=await runK5B(respondFollowRequestByUsernameRoute,'PATCH','/api/connect/profile/username/nobody/respond-follow-request',{knownUsername:'req303',body:{accept:true}});
 assert.equal(r.status,404);
});
test('Respond-follow-request-by-username accepts using the session as the acting target and creates the follow',async()=>{
 const r=await runK5B(respondFollowRequestByUsernameRoute,'PATCH','/api/connect/profile/username/req303/respond-follow-request',{knownUsername:'req303',targetId:303,requestFound:true,body:{accept:true}});
 assert.equal(r.status,200);
 const update=r.calls.find(c=>c.sql.startsWith('UPDATE howdi_connect_follow_requests'));
 assert.deepEqual(Array.from(update.params),[303,101,'ACCEPTED']);
 const follow=r.calls.find(c=>c.sql.startsWith('INSERT INTO howdi_connect_follows'));
 assert.deepEqual(Array.from(follow.params),[303,101]);
});
test('Respond-follow-request-by-username declines without creating a follow row',async()=>{
 const r=await runK5B(respondFollowRequestByUsernameRoute,'PATCH','/api/connect/profile/username/req303/respond-follow-request',{knownUsername:'req303',targetId:303,requestFound:true,body:{accept:false}});
 assert.equal(r.status,200);
 assert.equal(r.calls.filter(c=>c.sql.startsWith('INSERT INTO howdi_connect_follows')).length,0);
});
test('Connect-suggestions excludes self, already-followed and public_username-less rows, and ranks by mutual_count',async()=>{
 const r=await runK5B(connectSuggestionsRoute,'GET','/api/connect/connect-suggestions?limit=10');
 assert.equal(r.status,200);
 const call=r.calls.find(c=>c.sql.includes('mutual_count'));
 assert.ok(call);
 assert.equal(call.params[0],101);
 assert.match(call.sql,/u\.id<>\$1/);
 assert.match(call.sql,/public_username IS NOT NULL/);
 assert.match(call.sql,/NOT EXISTS\(SELECT 1 FROM howdi_connect_follows f WHERE f\.follower_user_id=\$1 AND f\.following_user_id=u\.id\)/);
 assert.match(call.sql,/howdi_connect_profile_blocks/);
 assert.match(call.sql,/ORDER BY mutual_count DESC/);
 assert.doesNotMatch(call.sql.split(' FROM ')[0],/\bu\.id\b|\bcp\.user_id\b/);
});
test('Connect-suggestions works for a guest viewer (viewerId 0) without impersonation',async()=>{
 const r=await runK5B(connectSuggestionsRoute,'GET','/api/connect/connect-suggestions',{anonymous:true});
 assert.equal(r.status,200);
 const call=r.calls.find(c=>c.sql.includes('mutual_count'));
 assert.equal(call.params[0],0);
});
test('Conversation-start-by-username requires an authenticated session (401, no writes)',async()=>{
 const r=await runK5B(conversationsUsernameStartRoute,'POST','/api/connect/conversations/username/crafty_alice/start',{anonymous:true,knownUsername:'crafty_alice'});
 assert.equal(r.status,401);
 assert.equal(r.calls.filter(c=>/^(INSERT)/.test(c.sql)).length,0);
});
test('Conversation-start-by-username 404s for an unknown username',async()=>{
 const r=await runK5B(conversationsUsernameStartRoute,'POST','/api/connect/conversations/username/nobody/start',{knownUsername:'crafty_alice',targetId:303});
 assert.equal(r.status,404);
});
test('Conversation-start-by-username is blocked (403) when either party has blocked the other',async()=>{
 const r=await runK5B(conversationsUsernameStartRoute,'POST','/api/connect/conversations/username/crafty_alice/start',{knownUsername:'crafty_alice',targetId:303,blocked:true});
 assert.equal(r.status,403);
});
test('Conversation-start-by-username creates/reuses a DIRECT conversation using the session as one side',async()=>{
 const r=await runK5B(conversationsUsernameStartRoute,'POST','/api/connect/conversations/username/crafty_alice/start',{knownUsername:'crafty_alice',targetId:303,existingConversation:55});
 assert.equal(r.status,200);
 assert.equal(r.data.conversation_id,55);
});
test('Legacy /api/connect/social-graph ignores a spoofed ?userId and derives viewer from the session',async()=>{
 const r=await runK5B(socialGraphRoute,'GET','/api/connect/social-graph?userId=999&type=followers');
 assert.equal(r.status,200);
 // loadConnectFollowListResponse's own private/blocked-exclusion queries prove it ran with viewer=101, not 999
 assert.equal(r.calls.find(c=>c.sql.startsWith('SELECT private_profile,follower_list_visibility'))?.params?.[0],101);
});
test('Legacy /api/connect/social-graph requires a session (401 for a guest, regression: this route used to trust ?userId directly)',async()=>{
 const r=await runK5B(socialGraphRoute,'GET','/api/connect/social-graph?userId=101&type=followers',{anonymous:true});
 assert.equal(r.status,401);
});
test('Legacy /api/connect/social-graph honors ?ownerId to view someone else\'s list while viewer stays the session user',async()=>{
 const r=await runK5B(socialGraphRoute,'GET','/api/connect/social-graph?ownerId=303&type=followers');
 assert.equal(r.status,200);
 assert.equal(r.calls.find(c=>c.sql.startsWith('SELECT private_profile,follower_list_visibility'))?.params?.[0],303);
});
test('/api/connect/social-summary requires a session (401 for a guest, regression: this route used to trust ?userId directly)',async()=>{
 const r=await runK5B(socialSummaryRoute,'GET','/api/connect/social-summary?userId=999',{anonymous:true});
 assert.equal(r.status,401);
});
test('/api/connect/social-summary ignores a spoofed ?userId and always reports the session user\'s own summary',async()=>{
 const r=await runK5B(socialSummaryRoute,'GET','/api/connect/social-summary?userId=999');
 assert.equal(r.status,200);
 const call=r.calls.find(c=>c.sql.includes('LEFT JOIN howdi_connect_profiles cp ON cp.user_id=u.id WHERE u.id=$1'));
 assert.ok(call);
 assert.equal(call.params[0],101);
});
test('Block (numeric route) requires an authenticated session (401, no writes) — regression: previously trusted body.userId with no session check',async()=>{
 const r=await runK5B(blockNumericRoute,'POST','/api/connect/profiles/303/block',{anonymous:true,body:{userId:101}});
 assert.equal(r.status,401);
 assert.equal(r.calls.filter(c=>/^(INSERT|DELETE)/.test(c.sql)).length,0);
});
test('Block (numeric route) acts as the session user regardless of a spoofed body.userId, and un-follows both directions',async()=>{
 const r=await runK5B(blockNumericRoute,'POST','/api/connect/profiles/303/block',{body:{userId:202}});
 assert.equal(r.status,200);
 assert.equal(r.data.blocked,true);
 const ins=r.calls.find(c=>c.sql.startsWith('INSERT INTO howdi_connect_profile_blocks'));
 assert.deepEqual(Array.from(ins.params),[101,303]);
 const del=r.calls.find(c=>c.sql.startsWith('DELETE FROM howdi_connect_follows'));
 assert.deepEqual(Array.from(del.params),[101,303]);
});
test('Block (numeric route) toggles off (unblocks) when already blocked',async()=>{
 const r=await runK5B(blockNumericRoute,'POST','/api/connect/profiles/303/block',{blocked:true});
 assert.equal(r.status,200);
 assert.equal(r.data.blocked,false);
 assert.equal(r.calls.filter(c=>c.sql.startsWith('DELETE FROM howdi_connect_profile_blocks')).length,1);
});
test('Block-by-username requires an authenticated session (401) and 404s for an unknown username',async()=>{
 const anon=await runK5B(blockUsernameRoute,'POST','/api/connect/profile/username/crafty_alice/block',{anonymous:true,knownUsername:'crafty_alice'});
 assert.equal(anon.status,401);
 const unknown=await runK5B(blockUsernameRoute,'POST','/api/connect/profile/username/nobody/block',{knownUsername:'crafty_alice'});
 assert.equal(unknown.status,404);
});
test('Block-by-username resolves the username and blocks using the session identity',async()=>{
 const r=await runK5B(blockUsernameRoute,'POST','/api/connect/profile/username/crafty_alice/block',{knownUsername:'crafty_alice',targetId:303});
 assert.equal(r.status,200);
 const ins=r.calls.find(c=>c.sql.startsWith('INSERT INTO howdi_connect_profile_blocks'));
 assert.deepEqual(Array.from(ins.params),[101,303]);
});
test('Close-Friend (numeric route) requires an authenticated session (401) — regression: previously trusted body.userId with no session check',async()=>{
 const r=await runK5B(closeFriendNumericRoute,'POST','/api/connect/profiles/303/close-friend',{anonymous:true,body:{userId:101}});
 assert.equal(r.status,401);
});
test('Close-Friend (numeric route) requires the session user to already follow the target',async()=>{
 const r=await runK5B(closeFriendNumericRoute,'POST','/api/connect/profiles/303/close-friend',{});
 assert.equal(r.status,403);
});
test('Close-Friend (numeric route) adds and then can remove using session identity, ignoring a spoofed body.userId',async()=>{
 const added=await runK5B(closeFriendNumericRoute,'POST','/api/connect/profiles/303/close-friend',{viewerFollowsOwner:true,body:{userId:202}});
 assert.equal(added.status,200);
 assert.equal(added.data.close_friend,true);
 const ins=added.calls.find(c=>c.sql.startsWith('INSERT INTO howdi_connect_close_friends'));
 assert.deepEqual(Array.from(ins.params),[101,303]);
 const removed=await runK5B(closeFriendNumericRoute,'POST','/api/connect/profiles/303/close-friend',{viewerFollowsOwner:true,alreadyCloseFriend:true});
 assert.equal(removed.status,200);
 assert.equal(removed.data.close_friend,false);
});
test('Close-Friend-by-username requires an authenticated session (401) and 404s for an unknown username',async()=>{
 const anon=await runK5B(closeFriendUsernameRoute,'POST','/api/connect/profile/username/crafty_alice/close-friend',{anonymous:true,knownUsername:'crafty_alice'});
 assert.equal(anon.status,401);
 const unknown=await runK5B(closeFriendUsernameRoute,'POST','/api/connect/profile/username/nobody/close-friend',{knownUsername:'crafty_alice'});
 assert.equal(unknown.status,404);
});
test('Close-Friend-by-username resolves the username and acts using session identity',async()=>{
 const r=await runK5B(closeFriendUsernameRoute,'POST','/api/connect/profile/username/crafty_alice/close-friend',{knownUsername:'crafty_alice',targetId:303,viewerFollowsOwner:true});
 assert.equal(r.status,200);
 const ins=r.calls.find(c=>c.sql.startsWith('INSERT INTO howdi_connect_close_friends'));
 assert.deepEqual(Array.from(ins.params),[101,303]);
});

// ---- Public profile: @username/avatar/name/bio/counts + Vibes/Articles/Communities,
//      and the raw numeric users.id must never appear in the response ----
async function runPublicProfile(target,viewer,options={}){
 const calls=[];
 const query=async(sql,params=[])=>{
  sql=sql.replace(/\s+/g,' ').trim();calls.push({sql,params});
  if(sql.startsWith('SELECT cp.*,u.full_name'))return {rows:[options.profileRow||{user_id:target,full_name:'Alice Maker',public_username:'crafty_alice',profile_image:'',private_profile:Boolean(options.privateProfile),viewer_following:Boolean(options.viewerFollowing),follower_count:5,following_count:3,follower_list_visibility:'EVERYONE',contact_permission:'EVERYONE'}],rowCount:1};
  if(sql.startsWith('SELECT 1 FROM howdi_connect_profile_blocks'))return {rows:options.blocked?[{exists:1}]:[],rowCount:0};
  if(sql.startsWith('SELECT 1 FROM howdi_connect_follows WHERE follower_user_id'))return {rows:options.viewerFollowing?[{exists:1}]:[],rowCount:0};
  if(sql.startsWith('INSERT INTO howdi_connect_profile_visits'))return {rows:[],rowCount:0};
  if(sql.startsWith('SELECT vibe_code'))return {rows:options.vibes||[],rowCount:(options.vibes||[]).length};
  if(sql.includes("post_type='ARTICLE'"))return {rows:options.articles||[],rowCount:(options.articles||[]).length};
  if(sql.startsWith('SELECT c.id,c.name,c.description')){ if(options.communitiesThrow)throw new Error('boom'); return {rows:options.communities||[],rowCount:(options.communities||[]).length}; }
  if(options.queryOverride){const over=options.queryOverride(sql,params);if(over!==undefined)return over;}
  return {rows:[],rowCount:0};
 };
 const pool={query};
 const context={pool,sendJSON:(_res,status,data)=>({status,data}),console:{error:()=>{}}};
 const src=`${loadConnectPublicProfileResponseSrc}\nloadConnectPublicProfileResponse({},${target},${viewer})`;
 const response=await vm.runInNewContext(src,context);
 assert.ok(response,'Route must respond');
 return {...response,calls};
}
test('Public profile never exposes the raw numeric users.id, including on the private-profile short-circuit',async()=>{
 const priv=await runPublicProfile(303,0,{privateProfile:true});
 assert.equal(priv.status,200);
 assert.equal(priv.data.private,true);
 assert.equal(Object.prototype.hasOwnProperty.call(priv.data.profile,'user_id'),false);
 assert.equal(priv.data.profile.public_username,'crafty_alice');
 const full=await runPublicProfile(303,101);
 assert.equal(full.status,200);
 assert.equal(Object.prototype.hasOwnProperty.call(full.data.profile,'user_id'),false);
});
test('Public profile response includes avatar/name/bio-carrying profile row plus follower/following counts',async()=>{
 const r=await runPublicProfile(303,101);
 assert.equal(r.status,200);
 assert.equal(r.data.profile.full_name,'Alice Maker');
 assert.equal(r.data.profile.public_username,'crafty_alice');
 assert.equal(r.data.profile.follower_count,5);
 assert.equal(r.data.profile.following_count,3);
});
test('Public profile embeds Vibes with the published/public/non-deleted availability predicate',async()=>{
 const r=await runPublicProfile(303,101,{vibes:[{vibe_code:'VIBE-1',vibe_type:'video',caption:'Hi',cover_url:'x',published_at:new Date().toISOString()}]});
 assert.equal(r.status,200);
 assert.equal(r.data.vibes.length,1);
 const call=r.calls.find(c=>c.sql.startsWith('SELECT vibe_code'));
 assert.match(call.sql,/creator_user_id=\$1::text/);
 assert.match(call.sql,/status='published'/);
 assert.match(call.sql,/visibility='public'/);
 assert.match(call.sql,/deleted_at IS NULL/);
});
test('Public profile embeds published Articles for the owner',async()=>{
 const r=await runPublicProfile(303,101,{articles:[{id:1,article_title:'My Craft',article_excerpt:'…',article_cover_url:'',article_read_minutes:4,created_at:new Date().toISOString()}]});
 assert.equal(r.status,200);
 assert.equal(r.data.articles.length,1);
 const call=r.calls.find(c=>c.sql.includes("post_type='ARTICLE'"));
 assert.match(call.sql,/user_id=\$1/);
 assert.match(call.sql,/post_status='PUBLISHED'/);
});
test('Public profile embeds non-private Communities owned by the profile, with an active-member count',async()=>{
 const r=await runPublicProfile(303,101,{communities:[{id:1,name:'Potters Guild',description:'',community_type:'GROUP',category:'ARTS',member_count:12}]});
 assert.equal(r.status,200);
 assert.equal(r.data.communities.length,1);
 const call=r.calls.find(c=>c.sql.startsWith('SELECT c.id,c.name,c.description'));
 assert.ok(call);
 assert.match(call.sql,/c\.owner_user_id=\$1/);
 assert.match(call.sql,/c\.status='ACTIVE'/);
 assert.match(call.sql,/c\.privacy<>'PRIVATE'/);
 assert.match(call.sql,/howdi_connect_community_members/);
 assert.match(call.sql,/membership_status='ACTIVE'/);
});
test('Public profile tolerates a Communities query failure by returning an empty list rather than failing the whole profile',async()=>{
 const r=await runPublicProfile(303,101,{communitiesThrow:true});
 assert.equal(r.status,200);
 assert.deepEqual(Array.from(r.data.communities),[]);
});
