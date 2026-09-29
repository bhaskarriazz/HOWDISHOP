'use strict';
const {isPublicUsername,isPublicWorkerCode,mediaUrl,excerpt,stripInternalKeys}=require('./connect-home-k5a.cjs');
const TYPES=Object.freeze(['people','creators','posts','articles','vibes']);
// K5A visibility fragments, reproduced verbatim from connect-home-k5a.cjs ($1 is always the viewer id, 0 for guests).
// Post/article viewer visibility is the injected server connectPostVisibleSql. tests/global-search-k5b.test.cjs asserts
// these fragments stay identical to the K5A Home SQL, so search cannot drift from Home.
function k5aFragments({connectPostVisibleSql,k5ePrivateProfileOkSql}){
  const ACTIVE_USER=(u)=>`(COALESCE(${u}.is_active,TRUE)=TRUE AND UPPER(COALESCE(${u}.account_status,'ACTIVE'))='ACTIVE')`;
  const NOT_BLOCKED=(owner)=>`NOT EXISTS(SELECT 1 FROM howdi_connect_profile_blocks kb WHERE (kb.blocker_user_id=$1::bigint AND kb.blocked_user_id=${owner}) OR (kb.blocker_user_id=${owner} AND kb.blocked_user_id=$1::bigint))`;
  const AUTHOR_FLOOR=(u,cp,owner)=>`(${cp}.public_username IS NOT NULL AND ${cp}.public_username<>'' AND COALESCE(${cp}.discoverable,TRUE)=TRUE
      AND ${ACTIVE_USER(u)} AND (${owner}=$1::bigint OR ${NOT_BLOCKED(owner)})
      AND (COALESCE(${cp}.private_profile,FALSE)=FALSE OR ($1::bigint>0 AND ${k5ePrivateProfileOkSql(owner,'$1::bigint')})))`;
  const POST_VISIBLE=(p)=>`((${p}.post_status='PUBLISHED' OR (${p}.post_status='SCHEDULED' AND ${p}.scheduled_for IS NOT NULL AND ${p}.scheduled_for<=NOW()))
      AND COALESCE(${p}.subscribers_only,FALSE)=FALSE AND COALESCE(${p}.subscriber_only,FALSE)=FALSE
      AND (($1::bigint=0 AND COALESCE(${p}.audience_scope,'EVERYONE')='EVERYONE') OR ($1::bigint>0 AND ${connectPostVisibleSql(p,'$1::bigint')})))`;
  const AVATAR=(cp,ps)=>`COALESCE(NULLIF(${cp}.avatar_data,''),NULLIF(${ps}.profile_image,''),'')`;
  const POST_WHERE=`${POST_VISIBLE('p')} AND ${AUTHOR_FLOOR('u','cp','p.user_id')}`;
  const VIBE_WHERE=`v.status='published' AND v.visibility='public' AND v.deleted_at IS NULL AND v.vibe_code IS NOT NULL AND ${AUTHOR_FLOOR('u','cp','u.id')}
        AND ($1::bigint=0 OR NOT EXISTS(SELECT 1 FROM vibe_creator_blocks b WHERE (b.blocker_user_id=$1::text AND b.blocked_creator_user_id=v.creator_user_id) OR (b.blocker_user_id=v.creator_user_id AND b.blocked_creator_user_id=$1::text)))`;
  return {AUTHOR_FLOOR,AVATAR,POST_WHERE,VIBE_WHERE};
}
// $1 viewer id, $2 lower-cased LIKE-escaped query (prefix/contains), $3 limit, $4 raw lower-cased query (exact). Ordering: exact > prefix > contains, then a stable tiebreak.
function searchSql(deps){
  const {AUTHOR_FLOOR,AVATAR,POST_WHERE,VIBE_WHERE}=k5aFragments(deps);
  const EQ=(c)=>`LOWER(${c})=$4`,PRE=(c)=>`LOWER(${c}) LIKE $2||'%' ESCAPE '\\'`,HAS=(c)=>`LOWER(COALESCE(${c},'')) LIKE '%'||$2||'%' ESCAPE '\\'`;
  const PUBLISHED=`COALESCE(CASE WHEN p.post_status='SCHEDULED' THEN p.scheduled_for END,p.created_at)`;
  const POST_SELECT=`SELECT p.id AS internal_key,p.post_type,p.content,p.post_status,p.audience_scope,p.subscribers_only,p.subscriber_only,
      (COALESCE(p.media_data,'')<>'' OR jsonb_array_length(CASE WHEN jsonb_typeof(p.media_gallery)='array' THEN p.media_gallery ELSE '[]'::jsonb END)>0) AS has_media,
      u.full_name AS display_name,cp.public_username,u.is_active,u.account_status,cp.discoverable`;
  const POST_FROM=`FROM howdi_community_posts p JOIN users u ON u.id=p.user_id JOIN howdi_connect_profiles cp ON cp.user_id=p.user_id`;
  const TITLE=`COALESCE(p.article_title,'')`;
  return {
    creators:`SELECT cp.public_username,u.full_name AS display_name,${AVATAR('cp','ps')} AS avatar,cp.headline,u.is_active,u.account_status,cp.discoverable
      FROM users u JOIN howdi_connect_profiles cp ON cp.user_id=u.id LEFT JOIN user_profile_settings ps ON ps.user_id=u.id
      WHERE cp.creator_mode=TRUE AND ${AUTHOR_FLOOR('u','cp','u.id')}
        AND (${EQ('cp.public_username')} OR ${PRE('cp.public_username')} OR ${HAS('u.full_name')})
      ORDER BY CASE WHEN ${EQ('cp.public_username')} THEN 0 WHEN ${PRE('cp.public_username')} THEN 1 ELSE 2 END,LOWER(cp.public_username) LIMIT $3`,
    posts:`${POST_SELECT} ${POST_FROM}
      WHERE UPPER(COALESCE(p.post_type,''))<>'ARTICLE' AND ${POST_WHERE}
        AND (${EQ('cp.public_username')} OR ${PRE('cp.public_username')} OR ${HAS('p.content')})
      ORDER BY CASE WHEN ${EQ('cp.public_username')} THEN 0 WHEN ${PRE('cp.public_username')} THEN 1 ELSE 2 END,${PUBLISHED} DESC,p.id DESC LIMIT $3`,
    articles:`${POST_SELECT},p.article_title,p.article_excerpt,COALESCE(NULLIF(p.article_cover_url,''),'') AS cover ${POST_FROM}
      WHERE UPPER(COALESCE(p.post_type,''))='ARTICLE' AND ${POST_WHERE}
        AND (${EQ('cp.public_username')} OR ${PRE('cp.public_username')} OR ${HAS('p.article_title')} OR ${HAS('p.article_excerpt')} OR ${HAS('p.content')})
      ORDER BY CASE WHEN ${EQ('cp.public_username')} OR ${EQ(TITLE)} THEN 0 WHEN ${PRE('cp.public_username')} OR ${PRE(TITLE)} THEN 1 ELSE 2 END,${PUBLISHED} DESC,p.id DESC LIMIT $3`,
    vibes:`SELECT v.vibe_code,v.caption,v.cover_url,u.full_name AS display_name,cp.public_username,u.is_active,u.account_status,cp.discoverable
      FROM vibes v JOIN users u ON u.id::text=v.creator_user_id JOIN howdi_connect_profiles cp ON cp.user_id=u.id
      WHERE ${VIBE_WHERE}
        AND (${EQ('cp.public_username')} OR ${PRE('cp.public_username')} OR ${HAS('v.caption')} OR ${HAS('u.full_name')})
      ORDER BY CASE WHEN ${EQ('cp.public_username')} THEN 0 WHEN ${PRE('cp.public_username')} THEN 1 ELSE 2 END,v.published_at DESC NULLS LAST,v.vibe_code DESC LIMIT $3`,
  };
}
function createGlobalSearchK5B({pool,getSessionUserFromRequest,sendJSON,k5ePrivateProfileOkSql,connectPostVisibleSql,issueRefs}){
  const SQL=typeof connectPostVisibleSql==='function'?searchSql({connectPostVisibleSql,k5ePrivateProfileOkSql}):null;
  // JS re-checks (same rules as K5A authorOk/postOk); the SQL is never trusted alone.
  const userOk=(r)=>r.is_active!==false&&String(r.account_status||'ACTIVE').toUpperCase()==='ACTIVE';
  const authorOk=(r)=>isPublicUsername(r.public_username)&&r.discoverable!==false&&userOk(r);
  const postOk=(r,vid)=>authorOk(r)&&r.subscribers_only!==true&&r.subscriber_only!==true&&(r.post_status==='PUBLISHED'||r.post_status==='SCHEDULED')&&(vid>0||String(r.audience_scope||'EVERYONE')==='EVERYONE');
  const isArticle=(r)=>String(r.post_type||'').toUpperCase()==='ARTICLE';
  const name=(r)=>excerpt(r.display_name||r.public_username,80);
  async function resolveViewer(req){const u=await getSessionUserFromRequest(req);if(!u||u.is_active===false||String(u.account_status||'ACTIVE').toUpperCase()!=='ACTIVE')return 0;const id=Number(u.id);return Number.isSafeInteger(id)&&id>0?id:0;}
  // K5A issueRefs is called only with rows that already passed both the SQL and the JS gate.
  async function withRefs(refType,prefix,rows){if(!rows.length)return [];const refs=await issueRefs(refType,rows.map(r=>r.internal_key));return rows.map(r=>({r,code:refs.get(String(r.internal_key))})).filter(x=>typeof x.code==='string'&&x.code.startsWith(prefix+'-'));}
  const run={
    async creators(vid,like,limit,exact){return (await pool.query(SQL.creators,[vid,like,limit,exact])).rows.filter(authorOk).map(x=>({type:'creator',public_username:x.public_username,display_name:name(x),avatar_url:mediaUrl(x.avatar),headline:excerpt(x.headline,120),route:'/@'+x.public_username}));},
    async posts(vid,like,limit,exact){const rows=(await pool.query(SQL.posts,[vid,like,limit,exact])).rows.filter(r=>postOk(r,vid)&&!isArticle(r));
      return (await withRefs('POST','PST',rows)).map(({r,code})=>({type:'post',public_key:code,public_username:r.public_username,display_name:name(r),text_excerpt:excerpt(r.content,280),has_media:r.has_media===true,route:'/posts/'+code}));},
    async articles(vid,like,limit,exact){const rows=(await pool.query(SQL.articles,[vid,like,limit,exact])).rows.filter(r=>postOk(r,vid)&&isArticle(r));
      return (await withRefs('ARTICLE','ART',rows)).map(({r,code})=>({type:'article',public_key:code,public_username:r.public_username,display_name:name(r),title:excerpt(r.article_title,160)||null,text_excerpt:excerpt(r.article_excerpt||r.content,280),cover_url:mediaUrl(r.cover),route:'/articles/'+code}));},
    async vibes(vid,like,limit,exact){return (await pool.query(SQL.vibes,[vid,like,limit,exact])).rows.filter(r=>authorOk(r)&&isPublicWorkerCode(r.vibe_code)).map(x=>({type:'vibe',public_key:x.vibe_code,caption:excerpt(x.caption,140)||null,cover_url:mediaUrl(x.cover_url),public_username:x.public_username,display_name:name(x),route:'/vibes/'+encodeURIComponent(x.vibe_code)}));},
  };
  return {async handle(req,res,url){if(req.method!=='GET'||url.pathname!=='/api/search')return false;const q=String(url.searchParams.get('q')||'').normalize('NFKC').replace(/\s+/g,' ').trim();const type=String(url.searchParams.get('type')||'people').toLowerCase(),raw=Number(url.searchParams.get('limit')||10);if(!TYPES.includes(type))return sendJSON(res,400,{status:'error',code:'INVALID_TYPE',message:'Unsupported search type.'}),true;if(q.length<2||q.length>80)return sendJSON(res,400,{status:'error',code:'INVALID_QUERY',message:q.length<2?'Enter at least 2 characters.':'Query is too long.'}),true;const limit=Math.max(1,Math.min(20,Number.isFinite(raw)?Math.floor(raw):10)),like=q.replace(/[\\%_]/g,'\\$&').toLowerCase(),exact=q.toLowerCase();
    if(type==='people'){const viewer=await getSessionUserFromRequest(req),vid=Number(viewer?.id||0);const rows=(await pool.query(`SELECT p.public_username,u.full_name AS display_name,COALESCE(NULLIF(p.avatar_data,''),NULLIF(ps.profile_image,''),'') AS avatar,p.headline FROM howdi_connect_profiles p JOIN users u ON u.id=p.user_id LEFT JOIN user_profile_settings ps ON ps.user_id=p.user_id WHERE COALESCE(u.is_active,TRUE)=TRUE AND UPPER(COALESCE(u.account_status,'ACTIVE'))='ACTIVE' AND p.public_username IS NOT NULL AND p.public_username<>'' AND COALESCE(p.discoverable,TRUE)=TRUE AND (${k5ePrivateProfileOkSql('p.user_id','$2::bigint')}) AND NOT EXISTS(SELECT 1 FROM howdi_connect_profile_blocks b WHERE (b.blocker_user_id=p.user_id AND b.blocked_user_id=$2) OR (b.blocker_user_id=$2 AND b.blocked_user_id=p.user_id)) AND (LOWER(p.public_username)=$4 OR LOWER(p.public_username) LIKE $1||'%' ESCAPE '\\' OR LOWER(COALESCE(u.full_name,'')) LIKE '%'||$1||'%' ESCAPE '\\') ORDER BY CASE WHEN LOWER(p.public_username)=$4 THEN 0 WHEN LOWER(p.public_username) LIKE $1||'%' ESCAPE '\\' THEN 1 ELSE 2 END,LOWER(p.public_username) LIMIT $3`,[like,vid,limit,exact])).rows;const results=rows.filter(x=>isPublicUsername(x.public_username)).map(x=>({type:'person',public_username:x.public_username,display_name:excerpt(x.display_name||x.public_username,80),avatar_url:mediaUrl(x.avatar),headline:excerpt(x.headline,120),route:'/@'+x.public_username}));sendJSON(res,200,{status:'success',query:q,type:'people',results,has_more:false,next_cursor:null});return true;}
    if(!SQL||((type==='posts'||type==='articles')&&typeof issueRefs!=='function'))return sendJSON(res,503,{status:'error',code:'SEARCH_UNAVAILABLE',message:'Search is temporarily unavailable.'}),true;
    try{const vid=await resolveViewer(req);const results=stripInternalKeys(await run[type](vid,like,limit,exact));sendJSON(res,200,{status:'success',query:q,type,results,has_more:false,next_cursor:null});}
    catch(error){console.error('[K5B search] '+type+' failed:',error&&error.message);if(!res.headersSent)sendJSON(res,500,{status:'error',code:'SEARCH_UNAVAILABLE',message:'Search is temporarily unavailable.'});}
    return true;}};
}
module.exports={createGlobalSearchK5B,SEARCH_TYPES:TYPES,_internal:{k5aFragments,searchSql}};
