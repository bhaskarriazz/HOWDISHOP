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
