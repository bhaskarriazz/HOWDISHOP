'use strict';
if(!process.env.K5A_PG_URL&&process.env.K5B_PG_URL)process.env.K5A_PG_URL=process.env.K5B_PG_URL;
if(!process.env.WORKER_PG_URL&&process.env.K5B_PG_URL)process.env.WORKER_PG_URL=process.env.K5B_PG_URL;
const L=require('../k5a-pg/lib.cjs');
const searchPeople=(q,{token,limit}={})=>L.api('GET','/api/search?q='+encodeURIComponent(q)+'&type=people&limit='+encodeURIComponent(limit===undefined?10:limit),{token});
module.exports={...L,searchPeople};
