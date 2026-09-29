'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../global-search-k5b.cjs'),'utf8');
const {createGlobalSearchK5B,SEARCH_TYPES,_internal}=require('../global-search-k5b.cjs');
const {createConnectHomeK5A,FORBIDDEN_KEY_RE}=require('../connect-home-k5a.cjs');
const cpv=(a,v)=>`CPV(${a},${v})`,ppo=(o,v)=>`PPO(${o},${v})`,ws=(s)=>s.replace(/\s+/g,' ').trim();
test('search input contract is bounded and type-scoped',()=>{assert.match(src,/q\.length<2/);assert.match(src,/q\.length>80/);assert.match(src,/Math\.max\(1,Math\.min\(20/);assert.deepEqual([...SEARCH_TYPES],['people','creators','posts','articles','vibes']);assert.match(src,/!TYPES\.includes\(type\)/);assert.match(src,/INVALID_TYPE/);});
test('people DTO is an explicit public allow-list',()=>{const m=src.match(/map\(x=>\(\{(type:'person'[^}]+)\}\)\)/);assert.ok(m);for(const key of ['type','public_username','display_name','avatar_url','headline','route'])assert.match(m[1],new RegExp('\\b'+key+'\\s*:'));assert.doesNotMatch(m[1],/\bid\s*:|email|phone|address|uuid|howdi_id|master_id/i);});
test('people ordering is exact then prefix then contains',()=>{assert.match(src,/CASE WHEN LOWER\(p\.public_username\)=\$1 THEN 0 WHEN LOWER\(p\.public_username\) LIKE \$1\|\|'%'/);});

// ---- K5A parity: search visibility fragments must be byte-identical (modulo whitespace) to the K5A Home SQL
const k5a=createConnectHomeK5A({pool:{},getSessionUserFromRequest:async()=>null,sendJSON(){},connectPostVisibleSql:cpv,k5ePrivateProfileOkSql:ppo,env:{HOWDI_HOME_CURSOR_KEY:'k'.repeat(40)},logger:{warn(){},error(){}}})._internal.SQL;
const F=_internal.k5aFragments({connectPostVisibleSql:cpv,k5ePrivateProfileOkSql:ppo});
test('post visibility is the K5A POST_WHERE built on the injected connectPostVisibleSql',()=>{assert.ok(ws(k5a.feedCandidates).includes(ws(F.POST_WHERE)));assert.ok(F.POST_WHERE.includes("CPV(p,$1::bigint)"));});
test('vibe visibility is the K5A Discover Vibes predicate (incl. bidirectional vibe_creator_blocks)',()=>{assert.ok(ws(k5a.vibes).includes(ws(F.VIBE_WHERE)));assert.match(F.VIBE_WHERE,/b\.blocker_user_id=\$1::text AND b\.blocked_creator_user_id=v\.creator_user_id\) OR \(b\.blocker_user_id=v\.creator_user_id AND b\.blocked_creator_user_id=\$1::text/);});
test('creator floor is the K5A AUTHOR_FLOOR plus creator_mode',()=>{assert.ok(ws(k5a.people(true)).includes(ws(F.AUTHOR_FLOOR('u','cp','u.id'))));const S=_internal.searchSql({connectPostVisibleSql:cpv,k5ePrivateProfileOkSql:ppo});assert.match(S.creators,/cp\.creator_mode=TRUE AND/);assert.ok(S.creators.includes(F.AUTHOR_FLOOR('u','cp','u.id')));});
test('content SQL is static, bound ($1 viewer, $2 query, $3 limit), ordered exact>prefix>contains, returns no score',()=>{const S=_internal.searchSql({connectPostVisibleSql:cpv,k5ePrivateProfileOkSql:ppo});for(const [k,sql] of Object.entries(S)){assert.deepEqual([...new Set(sql.match(/\$\d+/g))].sort(),['$1','$2','$3'],k);assert.match(sql,/ORDER BY CASE WHEN .*THEN 0 WHEN .*THEN 1 ELSE 2 END/s,k);assert.doesNotMatch(sql,/\bAS (score|rank)\b/i,k);}
  assert.match(S.posts,/UPPER\(COALESCE\(p\.post_type,''\)\)<>'ARTICLE'/);assert.match(S.articles,/UPPER\(COALESCE\(p\.post_type,''\)\)='ARTICLE'/);assert.match(S.vibes,/v\.status='published' AND v\.visibility='public' AND v\.deleted_at IS NULL AND v\.vibe_code IS NOT NULL/);});

// ---- runtime: routing, JS re-checks, refs issued only for visible rows, DTO allow-lists
const ROWS={
  creators:[{public_username:'k5b_maker',display_name:'Maker',avatar:'https://cdn.example/a.png',headline:'Potter',is_active:true,account_status:'ACTIVE',discoverable:true,user_id:991,email:'m@x.test'},
    {public_username:'k5b_gone',display_name:'Gone',avatar:'',headline:'',is_active:true,account_status:'SUSPENDED',discoverable:true}],
  posts:[{internal_key:'7001',post_type:'POST',content:'hello clay',post_status:'PUBLISHED',audience_scope:'EVERYONE',has_media:true,display_name:'Maker',public_username:'k5b_maker',is_active:true,account_status:'ACTIVE',discoverable:true},
    {internal_key:'7002',post_type:'POST',content:'fans only',post_status:'PUBLISHED',audience_scope:'EVERYONE',subscribers_only:true,public_username:'k5b_maker',is_active:true,account_status:'ACTIVE',discoverable:true},
    {internal_key:'7003',post_type:'POST',content:'followers',post_status:'PUBLISHED',audience_scope:'FOLLOWERS',public_username:'k5b_maker',is_active:true,account_status:'ACTIVE',discoverable:true},
    {internal_key:'7004',post_type:'ARTICLE',content:'not a post',post_status:'PUBLISHED',audience_scope:'EVERYONE',public_username:'k5b_maker',is_active:true,account_status:'ACTIVE',discoverable:true}],
  articles:[{internal_key:'8001',post_type:'ARTICLE',content:'long body',article_title:'Glazing 101',article_excerpt:'short',cover:'https://cdn.example/c.jpg',post_status:'PUBLISHED',audience_scope:'EVERYONE',display_name:'Maker',public_username:'k5b_maker',is_active:true,account_status:'ACTIVE',discoverable:true},
    {internal_key:'8002',post_type:'ARTICLE',content:'draft',article_title:'Draft',post_status:'DRAFT',audience_scope:'EVERYONE',public_username:'k5b_maker',is_active:true,account_status:'ACTIVE',discoverable:true}],
  vibes:[{vibe_code:'VB-K5BTEST01',caption:'spin',cover_url:'javascript:alert(1)',display_name:'Maker',public_username:'k5b_maker',is_active:true,account_status:'ACTIVE',discoverable:true,creator_user_id:'991'},
    {vibe_code:'3f2504e0-4f89-11d3-9a0c-0305e82c3301',caption:'uuid code',public_username:'k5b_maker',is_active:true,account_status:'ACTIVE',discoverable:true}],
  people:[{public_username:'k5b_maker',display_name:'Maker',avatar:'',headline:'Potter'}],
};
const pick=(sql)=>/FROM vibes v/.test(sql)?'vibes':/creator_mode=TRUE/.test(sql)?'creators':/='ARTICLE' AND/.test(sql)?'articles':/<>'ARTICLE' AND/.test(sql)?'posts':'people';
function harness({viewer=null,issueRefs:ir,cpvFn=cpv}={}){
  const calls=[],refCalls=[];
  const issueRefs=ir||(async(type,keys)=>{refCalls.push([type,keys]);return new Map(keys.map((k,i)=>[String(k),(type==='ARTICLE'?'ART':'PST')+'-'+String(i+1).padStart(12,'A')]));});
  const svc=createGlobalSearchK5B({pool:{query:async(sql,params)=>{calls.push({kind:pick(sql),params});return {rows:ROWS[pick(sql)]};}},getSessionUserFromRequest:async()=>viewer,sendJSON:(res,status,body)=>{res.status=status;res.body=body;},k5ePrivateProfileOkSql:ppo,connectPostVisibleSql:cpvFn,issueRefs});
  const get=async(qs)=>{const res={headersSent:false,setHeader(){}};const handled=await svc.handle({method:'GET'},res,new URL('http://x/api/search?'+qs));return {handled,...res};};
  return {get,calls,refCalls};
}
const keysOf=(o)=>Object.keys(o).sort();
test('every supported type is routed; unknown type is INVALID_TYPE',async()=>{const h=harness();for(const t of SEARCH_TYPES){const r=await h.get('q=k5b&type='+t);assert.equal(r.status,200,t);assert.equal(r.body.type,t);assert.equal(r.body.status,'success');}
  for(const t of ['bogus','users','PEOPLEX','']){const r=await h.get('q=k5b&type='+encodeURIComponent(t));if(t===''){assert.equal(r.status,200);continue;}assert.equal(r.status,400,t);assert.equal(r.body.code,'INVALID_TYPE');}
  assert.equal((await harness().get('q=k&type=posts')).body.code,'INVALID_QUERY');assert.equal((await harness().get('q='+'x'.repeat(81)+'&type=vibes')).body.code,'INVALID_QUERY');});
test('query and limit are bound parameters; LIKE wildcards are escaped; limit clamps 1..20',async()=>{const h=harness({viewer:{id:42}});await h.get('q='+encodeURIComponent('Ab%_\\x')+'&type=posts&limit=500');assert.deepEqual(h.calls[0].params,[42,'ab\\%\\_\\\\x',20]);await h.get('q=ab&type=vibes&limit=0');assert.equal(h.calls[1].params[2],1);});
test('inactive session viewer is treated as guest for content search',async()=>{const h=harness({viewer:{id:42,account_status:'SUSPENDED'}});await h.get('q=ab&type=creators');assert.equal(h.calls[0].params[0],0);});
test('creators DTO allow-list and JS floor re-check',async()=>{const r=await harness().get('q=k5b&type=creators');assert.equal(r.body.results.length,1);const c=r.body.results[0];assert.deepEqual(keysOf(c),['avatar_url','display_name','headline','public_username','route','type']);assert.equal(c.type,'creator');assert.equal(c.route,'/@k5b_maker');});
test('posts: guest JS gate drops subscriber/audience/article rows; PST refs issued only for visible rows',async()=>{const h=harness();const r=await h.get('q=k5b&type=posts');assert.deepEqual(h.refCalls,[['POST',['7001']]]);assert.equal(r.body.results.length,1);const p=r.body.results[0];
  assert.deepEqual(keysOf(p),['display_name','has_media','public_key','public_username','route','text_excerpt','type']);assert.match(p.public_key,/^PST-[0-9A-F]{12}$/);assert.equal(p.route,'/posts/'+p.public_key);assert.equal(p.has_media,true);});
test('posts: signed-in viewer keeps SQL-approved audience rows (connectPostVisibleSql decides in SQL)',async()=>{const h=harness({viewer:{id:5}});await h.get('q=k5b&type=posts');assert.deepEqual(h.refCalls,[['POST',['7001','7003']]]);});
test('articles: ART refs only for visible ARTICLE rows; safe DTO with cover_url',async()=>{const h=harness();const r=await h.get('q=glaz&type=articles');assert.deepEqual(h.refCalls,[['ARTICLE',['8001']]]);const a=r.body.results[0];
  assert.deepEqual(keysOf(a),['cover_url','display_name','public_key','public_username','route','text_excerpt','title','type']);assert.match(a.public_key,/^ART-/);assert.equal(a.title,'Glazing 101');assert.equal(a.text_excerpt,'short');assert.equal(a.cover_url,'https://cdn.example/c.jpg');});
test('a ref with the wrong prefix is never returned',async()=>{const r=await harness({issueRefs:async(t,keys)=>new Map(keys.map(k=>[String(k),'ART-AAAAAAAAAAAA']))}).get('q=k5b&type=posts');assert.equal(r.body.results.length,0);});
test('vibes: vibe_code only, uuid-shaped codes dropped, unsafe cover dropped',async()=>{const r=await harness().get('q=spin&type=vibes');assert.equal(r.body.results.length,1);const v=r.body.results[0];assert.deepEqual(keysOf(v),['caption','cover_url','display_name','public_key','public_username','route','type']);assert.equal(v.public_key,'VB-K5BTEST01');assert.equal(v.cover_url,null);assert.equal(v.route,'/vibes/VB-K5BTEST01');});
test('no content DTO carries an internal/private key or value',async()=>{for(const t of SEARCH_TYPES){const r=await harness().get('q=k5b&type='+t);const s=JSON.stringify(r.body.results);for(const x of r.body.results)for(const k of Object.keys(x))assert.ok(!FORBIDDEN_KEY_RE.test(k),t+':'+k);assert.doesNotMatch(s,/7001|7002|8001|991|m@x\.test|[0-9a-f]{8}-[0-9a-f]{4}-/i,t);}});
test('content search fails closed when dependencies are not injected',async()=>{const svc=createGlobalSearchK5B({pool:{query:async()=>({rows:[]})},getSessionUserFromRequest:async()=>null,sendJSON:(res,s,b)=>{res.status=s;res.body=b;},k5ePrivateProfileOkSql:ppo});for(const t of ['creators','posts','articles','vibes']){const res={};await svc.handle({method:'GET'},res,new URL('http://x/api/search?q=ab&type='+t));assert.equal(res.status,503,t);}});
test('server injects connectPostVisibleSql and K5A issueRefs after K5A is constructed',()=>{const s=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');const a=s.indexOf('const connectHomeK5A = require("./connect-home-k5a.cjs")'),b=s.indexOf('createGlobalSearchK5B({');assert.ok(a>0&&b>a);assert.match(s.slice(b,b+300),/connectPostVisibleSql, issueRefs: connectHomeK5A\._internal\.issueRefs/);});
