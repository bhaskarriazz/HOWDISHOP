// Shared helpers for the Shop S2 real-PostgreSQL suites (see run.cjs).
const {Pool}=require('pg');
const crypto=require('crypto');
const pool=new Pool({connectionString:process.env.SHOP_PG_URL});
const BASE=process.env.SHOP_BASE_URL||'http://127.0.0.1:5055';
async function api(method,path,{token,admin,body,headers}={}){
  const h={'content-type':'application/json',...(headers||{})};
  if(token)h.authorization='Bearer '+token;
  if(admin)h['x-howdi-admin-token']=admin;
  const r=await fetch(BASE+path,{method,headers:h,body:body===undefined?undefined:(typeof body==='string'?body:JSON.stringify(body))});
  const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{}
  return {status:r.status,json,text};
}
let seq=0;
async function mkUser(name,username){
  const n=++seq,email=username+'-'+crypto.randomBytes(3).toString('hex')+'@example.test',hid='SHOP-'+Date.now().toString(36)+n;
  const u=(await pool.query(`INSERT INTO users(full_name,email,phone,password_hash,howdi_id,master_id) VALUES($1,$2,$3,'x',$4,$5) RETURNING id,identity_uuid`,[name,email,'9'+String(Math.floor(Math.random()*1e9)).padStart(9,'0'),hid,'MST-'+hid])).rows[0];
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username`,[u.id,username]);
  const token='tok-'+username+'-'+crypto.randomBytes(6).toString('hex');
  await pool.query(`INSERT INTO user_sessions(id,user_id,session_token,is_active,created_at,last_seen_at) VALUES(gen_random_uuid(),$1,$2,TRUE,NOW(),NOW())`,[u.id,token]);
  return {id:Number(u.id),username,token,identity_uuid:u.identity_uuid};
}
async function mkVendor(user,business,status='active'){
  const v=(await pool.query(`INSERT INTO vendor_profiles(user_id,business_name,owner_name,status) VALUES($1,$2,$3,$4) RETURNING id`,[user.id,business,user.username,status])).rows[0];
  return Number(v.id);
}
let sku=0;
async function mkProduct(vendorId,name,over={}){
  const o={price:500,mrp:0,stock:5,status:'published',category:'Bags',subcategory:'Totes',published_at:new Date(Date.now()-86400000),archived_at:null,offer:null,...over};
  const r=(await pool.query(`INSERT INTO vendor_products(vendor_profile_id,name,sku,category,subcategory,description,mrp,price,stock,status,published_at,archived_at,
      vendor_offer_enabled,vendor_offer_type,vendor_offer_value,image_urls)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'["https://cdn.example/p.jpg"]'::jsonb) RETURNING id`,
    [vendorId,name,'SKU-'+(++sku),o.category,o.subcategory,'Handmade '+name,o.mrp,o.price,o.stock,o.status,o.published_at,o.archived_at,
     Boolean(o.offer),o.offer?o.offer.type:null,o.offer?o.offer.value:null])).rows[0];
  return String(r.id);
}
async function mkVariant(vendorId,productId,{colour='',size='',price=0,stock=0,status='active'}){
  const r=(await pool.query(`INSERT INTO vendor_product_variants(product_id,vendor_profile_id,colour,size_value,sku,price,stock,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [productId,vendorId,colour,size,'VSKU-'+(++sku),price,stock,status])).rows[0];
  return String(r.id);
}
async function mkAdmin(){
  const raw='howdi-admin-'+crypto.randomBytes(16).toString('hex');
  await pool.query(`INSERT INTO howdi_admin_sessions(username,token_hash,ip_address,user_agent,is_active,expires_at) VALUES('shop-test-admin',$1,'127.0.0.1','test',TRUE,NOW()+interval '1 hour')`,[crypto.createHash('sha256').update(raw).digest('hex')]);
  return raw;
}
// tiny assertion collector: every check is reported, the process exits non-zero if any failed
const results={pass:0,fail:0};
function check(name,cond,detail){
  if(cond){results.pass++;}
  else{results.fail++;console.log('FAIL '+name+(detail===undefined?'':' :: '+(typeof detail==='string'?detail:JSON.stringify(detail)).slice(0,400)));}
}
function finish(label){
  console.log(`${label}: ${results.pass} passed, ${results.fail} failed`);
  return pool.end().then(()=>process.exit(results.fail?1:0));
}
module.exports={pool,api,mkUser,mkVendor,mkProduct,mkVariant,mkAdmin,check,finish,BASE};
