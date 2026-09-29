'use strict';
const {isPublicUsername,isPublicWorkerCode,isSlug,mediaUrl,excerpt,stripInternalKeys}=require('./connect-home-k5a.cjs');
const TYPES=Object.freeze(['people','creators','posts','articles','vibes','groups','channels','products']);
// Shop helpers reproduced verbatim from connect-home-k5a.cjs (module-private there); the unit tests compare their source text.
function money(value) { if (value === null || value === undefined || value === '') return null; const n = Number(value); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; }
function firstImage(list) {
  let arr = list;
  if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch { arr = [arr]; } }
  if (!Array.isArray(arr)) return null;
  for (const item of arr) { const u = mediaUrl(typeof item === 'object' && item ? item.url : item); if (u) return u; }
  return null;
}
// Same rule as the Shop S1 catalogue's JS gate (shopS1RowVisible), mirrored because that helper is request-scoped.
const shopRowVisible = (r) => {
  if (String(r.status || '').toLowerCase() !== 'published' || r.archived_at) return false;
  if (String(r.vendor_status || 'active').toLowerCase() !== 'active') return false;
  const at = r.published_at ? new Date(r.published_at).getTime() : null;
  if (at && Number.isFinite(at) && at > Date.now()) return false;
  if (r.moderation_status && String(r.moderation_status).trim().toUpperCase() !== 'APPROVED') return false;
  return true;
};
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
  const SPACE_WHERE=`s.is_archived=FALSE AND s.privacy='PUBLIC' AND s.slug IS NOT NULL AND ${ACTIVE_USER('ou')} AND ${NOT_BLOCKED('s.owner_user_id')}`;
  const SHOP_CREATOR=`CASE WHEN cp.user_id IS NOT NULL AND COALESCE(cp.private_profile,FALSE)=FALSE THEN cp.public_username END`;
  const SHOP_FROM=`FROM vendor_products p JOIN vendor_profiles v ON v.id=p.vendor_profile_id JOIN users u ON u.id=v.user_id
        LEFT JOIN howdi_connect_profiles cp ON cp.user_id=v.user_id AND cp.public_username IS NOT NULL AND COALESCE(cp.discoverable,TRUE)=TRUE`;
  const SHOP_WHERE=`p.status='published' AND p.archived_at IS NULL AND (p.published_at IS NULL OR p.published_at<=NOW()) AND COALESCE(v.status,'active')='active'
        AND COALESCE(UPPER((SELECT m.status FROM howdi_shop_product_moderation_v162c m WHERE m.product_id=p.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1)),'APPROVED')='APPROVED'
        AND ${ACTIVE_USER('u')} AND ${NOT_BLOCKED('v.user_id')}
        AND (CASE WHEN EXISTS(SELECT 1 FROM vendor_product_variants pv WHERE pv.product_id=p.id)
              THEN EXISTS(SELECT 1 FROM vendor_product_variants pv WHERE pv.product_id=p.id AND LOWER(COALESCE(pv.status,'active'))='active' AND COALESCE(pv.stock,0)>0)
              ELSE COALESCE(p.stock,0)>0 END)`;
  return {AUTHOR_FLOOR,AVATAR,POST_WHERE,VIBE_WHERE,SPACE_WHERE,SHOP_CREATOR,SHOP_FROM,SHOP_WHERE};
}
// $1 viewer id, $2 lower-cased LIKE-escaped query (prefix/contains), $3 limit, $4 raw lower-cased query (exact). Ordering: exact > prefix > contains, then a stable tiebreak.
function searchSql(deps){
  const {AUTHOR_FLOOR,AVATAR,POST_WHERE,VIBE_WHERE,SPACE_WHERE,SHOP_CREATOR,SHOP_FROM,SHOP_WHERE}=k5aFragments(deps);
  const CREATOR=`(${SHOP_CREATOR})`;
  const EQ=(c)=>`LOWER(${c})=$4`,PRE=(c)=>`LOWER(${c}) LIKE $2||'%' ESCAPE '\\'`,HAS=(c)=>`LOWER(COALESCE(${c},'')) LIKE '%'||$2||'%' ESCAPE '\\'`;
  const PUBLISHED=`COALESCE(CASE WHEN p.post_status='SCHEDULED' THEN p.scheduled_for END,p.created_at)`;
  const POST_SELECT=`SELECT p.id AS internal_key,p.post_type,p.content,p.post_status,p.audience_scope,p.subscribers_only,p.subscriber_only,
      (COALESCE(p.media_data,'')<>'' OR jsonb_array_length(CASE WHEN jsonb_typeof(p.media_gallery)='array' THEN p.media_gallery ELSE '[]'::jsonb END)>0) AS has_media,
      u.full_name AS display_name,cp.public_username,u.is_active,u.account_status,cp.discoverable`;
  const POST_FROM=`FROM howdi_community_posts p JOIN users u ON u.id=p.user_id JOIN howdi_connect_profiles cp ON cp.user_id=p.user_id`;
  const TITLE=`COALESCE(p.article_title,'')`;
  // spaceType is a fixed literal ('GROUP' | 'CHANNEL'), never request input.
  const SPACES=(spaceType)=>`SELECT s.space_type,s.name,s.slug,s.category,s.member_count,s.is_archived,s.privacy,ou.is_active,ou.account_status
      FROM howdi_connect_social_spaces s JOIN users ou ON ou.id=s.owner_user_id
      WHERE s.space_type='${spaceType}' AND ${SPACE_WHERE}
        AND (${EQ('s.name')} OR ${EQ('s.slug')} OR ${PRE('s.name')} OR ${PRE('s.slug')} OR ${HAS('s.name')} OR ${HAS('s.slug')} OR ${HAS('s.category')})
      ORDER BY CASE WHEN ${EQ('s.name')} OR ${EQ('s.slug')} THEN 0 WHEN ${PRE('s.name')} OR ${PRE('s.slug')} THEN 1 ELSE 2 END,s.member_count DESC,s.slug LIMIT $3`;
  return {
    // Creator username is searchable only where K5A would display it (discoverable, non-private profile).
    products:`SELECT p.id AS internal_key,p.name,p.category,p.price,p.mrp,p.image_urls,p.status,p.archived_at,p.published_at,COALESCE(v.status,'active') AS vendor_status,
        (SELECT m.status FROM howdi_shop_product_moderation_v162c m WHERE m.product_id=p.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS moderation_status,
        v.business_name AS store_name,${CREATOR} AS creator_public_username,u.is_active,u.account_status
      ${SHOP_FROM}
      WHERE ${SHOP_WHERE}
        AND (${EQ('p.name')} OR ${EQ('v.business_name')} OR ${EQ(CREATOR)} OR ${PRE('p.name')} OR ${PRE('v.business_name')} OR ${PRE(CREATOR)}
          OR ${HAS('p.name')} OR ${HAS('p.category')} OR ${HAS('v.business_name')} OR ${HAS(CREATOR)})
      ORDER BY CASE WHEN ${EQ('p.name')} OR ${EQ('v.business_name')} OR ${EQ(CREATOR)} THEN 0 WHEN ${PRE('p.name')} OR ${PRE('v.business_name')} OR ${PRE(CREATOR)} THEN 1 ELSE 2 END,
        p.published_at DESC NULLS LAST,p.id DESC LIMIT $3`,
    groups:SPACES('GROUP'),
    channels:SPACES('CHANNEL'),
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
  const count=(v)=>{const n=Math.floor(Number(v));return Number.isFinite(n)&&n>=0?n:0;};
  const spaceOk=(r,spaceType)=>r.space_type===spaceType&&r.is_archived===false&&r.privacy==='PUBLIC'&&isSlug(r.slug)&&userOk(r);
  async function spaces(vid,like,limit,exact,spaceType,kind){return (await pool.query(SQL[kind+'s'],[vid,like,limit,exact])).rows.filter(r=>spaceOk(r,spaceType)).map(x=>({type:kind,public_key:x.slug,name:excerpt(x.name,80),category:excerpt(x.category,60)||null,member_count:count(x.member_count),route:`/${kind}s/${x.slug}`}));}
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
    async products(vid,like,limit,exact){const rows=(await pool.query(SQL.products,[vid,like,limit,exact])).rows.filter(r=>shopRowVisible(r)&&userOk(r));
      return (await withRefs('PRODUCT','PRD',rows)).map(({r,code})=>{const price=money(r.price),mrp=money(r.mrp);return {type:'product',public_key:code,title:excerpt(r.name,120),image_url:firstImage(r.image_urls),price,
        compare_at_price:mrp!==null&&price!==null&&mrp>price?mrp:null,currency:'INR',category:excerpt(r.category,60)||null,
        store:{name:excerpt(r.store_name,80)||null,public_username:isPublicUsername(r.creator_public_username)?r.creator_public_username:null},route:'/shop/products/'+code};});},
    async groups(vid,like,limit,exact){return spaces(vid,like,limit,exact,'GROUP','group');},
    async channels(vid,like,limit,exact){return spaces(vid,like,limit,exact,'CHANNEL','channel');},
  };
  return {async handle(req,res,url){if(req.method!=='GET'||url.pathname!=='/api/search')return false;const q=String(url.searchParams.get('q')||'').normalize('NFKC').replace(/\s+/g,' ').trim();const type=String(url.searchParams.get('type')||'people').toLowerCase(),raw=Number(url.searchParams.get('limit')||10);if(!TYPES.includes(type))return sendJSON(res,400,{status:'error',code:'INVALID_TYPE',message:'Unsupported search type.'}),true;if(q.length<2||q.length>80)return sendJSON(res,400,{status:'error',code:'INVALID_QUERY',message:q.length<2?'Enter at least 2 characters.':'Query is too long.'}),true;const limit=Math.max(1,Math.min(20,Number.isFinite(raw)?Math.floor(raw):10)),like=q.replace(/[\\%_]/g,'\\$&').toLowerCase(),exact=q.toLowerCase();
    if(type==='people'){const viewer=await getSessionUserFromRequest(req),vid=Number(viewer?.id||0);const rows=(await pool.query(`SELECT p.public_username,u.full_name AS display_name,COALESCE(NULLIF(p.avatar_data,''),NULLIF(ps.profile_image,''),'') AS avatar,p.headline FROM howdi_connect_profiles p JOIN users u ON u.id=p.user_id LEFT JOIN user_profile_settings ps ON ps.user_id=p.user_id WHERE COALESCE(u.is_active,TRUE)=TRUE AND UPPER(COALESCE(u.account_status,'ACTIVE'))='ACTIVE' AND p.public_username IS NOT NULL AND p.public_username<>'' AND COALESCE(p.discoverable,TRUE)=TRUE AND (${k5ePrivateProfileOkSql('p.user_id','$2::bigint')}) AND NOT EXISTS(SELECT 1 FROM howdi_connect_profile_blocks b WHERE (b.blocker_user_id=p.user_id AND b.blocked_user_id=$2) OR (b.blocker_user_id=$2 AND b.blocked_user_id=p.user_id)) AND (LOWER(p.public_username)=$4 OR LOWER(p.public_username) LIKE $1||'%' ESCAPE '\\' OR LOWER(COALESCE(u.full_name,'')) LIKE '%'||$1||'%' ESCAPE '\\') ORDER BY CASE WHEN LOWER(p.public_username)=$4 THEN 0 WHEN LOWER(p.public_username) LIKE $1||'%' ESCAPE '\\' THEN 1 ELSE 2 END,LOWER(p.public_username) LIMIT $3`,[like,vid,limit,exact])).rows;const results=rows.filter(x=>isPublicUsername(x.public_username)).map(x=>({type:'person',public_username:x.public_username,display_name:excerpt(x.display_name||x.public_username,80),avatar_url:mediaUrl(x.avatar),headline:excerpt(x.headline,120),route:'/@'+x.public_username}));sendJSON(res,200,{status:'success',query:q,type:'people',results,has_more:false,next_cursor:null});return true;}
    if(!SQL||((type==='posts'||type==='articles')&&typeof issueRefs!=='function'))return sendJSON(res,503,{status:'error',code:'SEARCH_UNAVAILABLE',message:'Search is temporarily unavailable.'}),true;
    try{const vid=await resolveViewer(req);const results=stripInternalKeys(await run[type](vid,like,limit,exact));sendJSON(res,200,{status:'success',query:q,type,results,has_more:false,next_cursor:null});}
    catch(error){console.error('[K5B search] '+type+' failed:',error&&error.message);if(!res.headersSent)sendJSON(res,500,{status:'error',code:'SEARCH_UNAVAILABLE',message:'Search is temporarily unavailable.'});}
    return true;}};
}
module.exports={createGlobalSearchK5B,SEARCH_TYPES:TYPES,_internal:{k5aFragments,searchSql,shopRowVisible,money,firstImage}};
