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
const helpers=between('    const HOWDI_ATTACHMENT_RULES =','    function number(')+between('    function getBody(req)','    // =====================================================\n    // URL HELPER')+between('    async function getSessionUserFromRequest(req)','    function adminTokenHash(');
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
