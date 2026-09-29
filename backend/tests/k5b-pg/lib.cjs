'use strict';
if(!process.env.K5A_PG_URL&&process.env.K5B_PG_URL)process.env.K5A_PG_URL=process.env.K5B_PG_URL;
if(!process.env.WORKER_PG_URL&&process.env.K5B_PG_URL)process.env.WORKER_PG_URL=process.env.K5B_PG_URL;
const L=require('../k5a-pg/lib.cjs');
const searchPeople=(q,{token,limit}={})=>L.api('GET','/api/search?q='+encodeURIComponent(q)+'&type=people&limit='+encodeURIComponent(limit===undefined?10:limit),{token});
const search=(type,q,{token,limit}={})=>L.api('GET','/api/search?q='+encodeURIComponent(q)+'&type='+encodeURIComponent(type)+'&limit='+encodeURIComponent(limit===undefined?10:limit),{token});
// a vibe in any lifecycle state (K5A's vibe() fixture only makes published/public ones)
const vibeAs=async(creator,code,caption,{status='published',visibility='public',deleted=false,cover=null}={})=>({id:(await L.pool.query(`INSERT INTO vibes(vibe_code,creator_user_id,caption,status,visibility,published_at,deleted_at,cover_url) VALUES($1,$2,$3,$4,$5,NOW(),${deleted?'NOW()':'NULL'},$6) RETURNING id`,[code,String(creator.id),caption,status,visibility,cover])).rows[0].id,code});
const vibeBlock=(blocker,creator)=>L.pool.query(`INSERT INTO vibe_creator_blocks(blocker_user_id,blocked_creator_user_id,reason) VALUES($1,$2,'user_block') ON CONFLICT DO NOTHING`,[String(blocker.id),String(creator.id)]);
// run-all.cjs shares one scratch DB across suites while K5A's bigId() sequence restarts per process: skip ahead so pinned ids never collide
const reserveIds=(n)=>{for(let i=0;i<n;i++)L.bigId();};
module.exports={...L,searchPeople,search,vibeAs,vibeBlock,reserveIds};
