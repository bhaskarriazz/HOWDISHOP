// Shop S1 — Catalogue & Product Discovery regression tests.
// Runs the REAL route/helper source extracted from server.js inside a vm against an in-memory pool double
// (no live PostgreSQL, no server startup) — same approach as the K3/K5D suites.
//
// The double deliberately behaves like a *careless* database: it hands back EVERY seeded product (drafts,
// archived, hidden, moderated, suspended vendor, scheduled) no matter what the SQL WHERE clause says, and every
// row carries internal identifiers (vendor_profile_id, vendor_code, user_id, howdi_id ...). That makes the tests
// prove the JS visibility gate and the public allow-lists on their own. The SQL WHERE clause itself is pinned
// with static assertions below (and was verified against a real PostgreSQL 16 while developing).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8').replace(/\r\n/g,'\n');
const jsx=fs.readFileSync(path.join(__dirname,'../../apps/customer/src/components/ShopCatalogue.jsx'),'utf8').replace(/\r\n/g,'\n');
const css=fs.readFileSync(path.join(__dirname,'../../apps/customer/src/components/ShopCatalogue.css'),'utf8').replace(/\r\n/g,'\n');
const app=fs.readFileSync(path.join(__dirname,'../../apps/customer/src/App.jsx'),'utf8').replace(/\r\n/g,'\n');
function between(a,b){const s=source.indexOf(a);assert.notEqual(s,-1,a);const e=source.indexOf(b,s+a.length);assert.notEqual(e,-1,b);return source.slice(s,e);}

const attachSrc=between('    async function attachVendorVariants(productRows){','    function parseVendorProductId');
const shopSrc=between('    function customerVariantPayload(v){','    // =====================================================\n    // VENDOR PRODUCT MEDIA UPLOAD');
// S1 ends where the Shop S2 (product actions) block begins; S2 is pinned by shop-s2-product-actions.test.cjs.
const s1Block=between('    // HOWDI SHOP S1 — CATALOGUE & PRODUCT DISCOVERY','    // =====================================================\n    // HOWDI SHOP S2 — PRODUCT ACTIONS');
const loaderSrc=between('    async function loadShopS1Rows(opts = {}) {','    // ---- product model');
const legacyRowsSrc=between('    async function getCustomerProductRows(','    async function getCustomerVariantsForRow');

// ---------- fixture ----------
const LEAK_VALUES=['9191917','HOWDI-VND-000777','4242427','HOW-SECRET-V','Secret Owner Fullname','8181818'];
const day=(n)=>`2026-09-${String(n).padStart(2,'0')}T00:00:00.000Z`;
const FUTURE=new Date(Date.now()+86400000*90).toISOString();
const ASHA={public_username:'asha_crochet',avatar:'data:image/png;base64,QUFB',business_name:'Asha Crochet Studio'};
const BINA={public_username:null,avatar:'',business_name:'Bina Handloom'};

function product(id,name,over={}){
  return {
    id,name,sku:`SKU-${id}`,category:'Bags',subcategory:'Totes',product_type:'',short_description:'',
    description:`Handmade crochet ${name}`,mrp:0,price:500,stock:5,low_stock_threshold:5,
    variant_options:{colors:[],sizes:[]},image_urls:[`https://cdn.example/${id}.jpg`],video_url:'',highlights:[],materials:[],
    specifications:{},size_chart:[],care_instructions:'',personalisation_enabled:false,personalisation_details:'',processing_days:3,
    vendor_offer_enabled:false,vendor_offer_type:null,vendor_offer_value:null,vendor_offer_start:null,vendor_offer_end:null,offer_stock:null,
    fulfillment_mode:'vendor_dispatch',commercial_owner:'vendor',
    status:'published',archived_at:null,published_at:day(id),updated_at:day(id),
    // internal columns a careless SELECT * could return — none of these may ever reach the browser
    vendor_profile_id:9191917,vendor_code:'HOWDI-VND-000777',user_id:4242427,owner_id:8181818,howdi_id:'HOW-SECRET-V',
    creator_full_name:'Secret Owner Fullname',vendor_status:'active',vendor_city:'Warangal',vendor_state:'TS',vendor_rating:'4.50',vendor_kyc_status:'verified',
    moderation_status:null,
    ...ASHA,creator_public_username:ASHA.public_username,creator_avatar:ASHA.avatar,
    ...over
  };
}
function creatorOf(c){return {business_name:c.business_name,creator_public_username:c.public_username,creator_avatar:c.avatar};}
function variant(id,productId,colour,size,price,mrp,stock,status='active',order=0){
  return {id,product_id:productId,colour,size_value:size,sku:`V-${id}`,mrp,price,stock,low_stock_threshold:5,image_urls:[`https://cdn.example/v${id}.jpg`],status,sort_order:order,vendor_profile_id:9191917};
}
function seed(){
  const products=[
    product(1,'Tote Bag',{category:'Bags',subcategory:'Totes',price:999,mrp:1199,stock:100,materials:['Cotton yarn']}),
    product(2,'Cream Clutch',{category:'Bags',subcategory:'Clutches',price:450,mrp:450,stock:4,variant_options:{colors:['Cream'],sizes:[]}}),
    product(3,'Draft Basket',{category:'Home',subcategory:'Baskets',status:'draft'}),
    product(4,'Archived Hat',{category:'Accessories',subcategory:'Hats',archived_at:day(20)}),
    product(5,'Hidden Scarf',{category:'Accessories',subcategory:'Scarves',status:'hidden'}),
    product(6,'Rejected Rug',{category:'Home',subcategory:'Rugs',moderation_status:'REJECTED'}),
    product(7,'Pending Pouch',{category:'Bags',subcategory:'Pouches',moderation_status:'PENDING'}),
    product(8,'Suspended Toy',{category:'Toys',subcategory:'Amigurumi',vendor_status:'suspended'}),
    product(9,'Scheduled Shawl',{category:'Accessories',subcategory:'Shawls',published_at:FUTURE}),
    product(10,'Inactive Variants Blanket',{category:'Home',subcategory:'Blankets',price:2200,mrp:2200,stock:50,...creatorOf(BINA)}),
    product(11,'Sold Out Throw',{category:'Home',subcategory:'Blankets',price:2500,mrp:2500,stock:0,materials:['Wool'],...creatorOf(BINA),creator_avatar:'data:image/png;base64,'+'A'.repeat(40000)}),
    product(12,'Offer Bag',{category:'Bags',subcategory:'Totes',price:1000,mrp:1000,stock:6,vendor_offer_enabled:true,vendor_offer_type:'percentage',vendor_offer_value:10,...creatorOf(BINA),creator_avatar:'javascript:alert(1)'}),
    product(13,'Approved Pouch',{category:'Bags',subcategory:'Pouches',price:350,mrp:350,stock:9,moderation_status:'approved'})
  ];
  const variants=[
    variant(101,1,'Red','M',999,1199,5,'active',0),
    variant(104,1,'Red','L',989,1189,3,'active',1),
    variant(102,1,'Blue','M',1099,1299,0,'active',2),
    variant(103,1,'Green','L',899,1099,9,'inactive',3),
    variant(201,10,'Grey','Single',2200,2400,50,'inactive',0),
    variant(202,10,'Ivory','Double',2600,2800,30,'inactive',1)
  ];
  return {products,variants,moderationTable:true,failWith:null};
}
const VISIBLE_NAMES=['Approved Pouch','Cream Clutch','Inactive Variants Blanket','Offer Bag','Sold Out Throw','Tote Bag'];
const HIDDEN={3:'Draft Basket',4:'Archived Hat',5:'Hidden Scarf',6:'Rejected Rug',7:'Pending Pouch',8:'Suspended Toy',9:'Scheduled Shawl'};

// ---------- harness ----------
async function call(route,{db=seed()}={}){
  const queries=[];const logged=[];
  const pool={query:async(rawSql,params=[])=>{
    const sql=String(rawSql).replace(/\s+/g,' ').trim();queries.push({sql,params});
    if(db.failWith)throw new Error(db.failWith);
    if(!db.moderationTable&&sql.includes('howdi_shop_product_moderation_v162c'))throw Object.assign(new Error('relation "howdi_shop_product_moderation_v162c" does not exist'),{code:'42P01'});
    if(sql.includes('FROM howdi_public_refs')){
      const publicKeys={'PRD-AAAAAAAAAAAA':'1','PRD-BBBBBBBBBBBB':'3'};
      const entityKey=publicKeys[String(params[0])];
      return {rows:entityKey?[{entity_key:entityKey}]:[]};
    }
    if(sql.includes('FROM vendor_products p')){
      const m=sql.match(/p\.id\s*=\s*\$(\d+)/);
      let rows=db.products;
      if(m)rows=rows.filter(r=>String(r.id)===String(params[Number(m[1])-1]));
      return {rows:rows.map(r=>({...r}))};
    }
    if(sql.includes('FROM vendor_product_variants')&&sql.includes('ANY($1')){
      const ids=(params[0]||[]).map(String);
      return {rows:db.variants.filter(v=>ids.includes(String(v.product_id))).map(v=>({...v}))};
    }
    if(sql.includes('FROM vendor_product_variants')&&sql.includes('product_id=$1'))return {rows:db.variants.filter(v=>String(v.product_id)===String(params[0]))};
    throw new Error('unexpected SQL in test double: '+sql.slice(0,120));
  }};
  const u=new URL(route,'http://shop.test');
  const context={pool,req:{method:'GET',headers:{}},res:{},url:u,pathname:u.pathname,URL,Buffer,
    console:{error:(...a)=>logged.push(a.map(String).join(' ')),log(){},warn(){}},
    clean:x=>String(x??'').trim(),sendJSON:(_res,status,data)=>({status,data})};
  const out=await vm.runInNewContext(attachSrc+'\n(async()=>{'+shopSrc+'})()',context);
  return {status:out&&out.status,data:out&&JSON.parse(JSON.stringify(out.data)),queries,logged,handled:Boolean(out)};
}
const names=(r)=>r.data.products.map(p=>p.name);
async function list(qs='',opts){const r=await call('/api/shop/catalogue/products'+(qs?'?'+qs:''),opts);assert.equal(r.status,200,JSON.stringify(r.data));return r;}
async function listNames(qs,opts){return names(await list(qs,opts));}
function keysDeep(v,acc=new Set()){if(Array.isArray(v))v.forEach(x=>keysDeep(x,acc));else if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){acc.add(k);keysDeep(x,acc);}return acc;}
const FORBIDDEN_KEYS=['vendor_profile_id','vendorProfileId','vendor_id','vendorId','vendor_code','vendorCode','user_id','userId','owner_id','ownerId','creator_id','creatorId','seller_user_id','sellerUserId','howdi_id','howdiId','master_id','masterId','actor_user_id','uuid','email','phone'];
function assertNoInternalIdentity(payload,label){
  const text=JSON.stringify(payload);
  for(const v of LEAK_VALUES)assert.ok(!text.includes(v),`${label}: leaked value ${v}`);
  const keys=keysDeep(payload);
  for(const k of FORBIDDEN_KEYS)assert.ok(!keys.has(k),`${label}: leaked key ${k}`);
}

// ---------- visibility ----------
test('browse returns only published, active, non-archived, non-moderated, non-scheduled products',async()=>{
  const r=await list('limit=48');
  assert.deepEqual(names(r).sort(),[...VISIBLE_NAMES].sort());
  assert.equal(r.data.total,6);
  const ids=r.data.products.map(p=>Number(p.id));
  for(const id of Object.keys(HIDDEN))assert.ok(!ids.includes(Number(id)),`hidden product ${id} leaked into browse`);
});
test('moderation status is case-insensitive: APPROVED/approved visible, REJECTED and PENDING hidden',async()=>{
  const all=await listNames('limit=48');
  assert.ok(all.includes('Approved Pouch'));
  assert.ok(!all.includes('Rejected Rug'));assert.ok(!all.includes('Pending Pouch'));
});
test('search never surfaces hidden products, even when their text matches',async()=>{
  for(const word of ['draft','archived','hidden','rejected','pending','suspended','scheduled']){
    const r=await list('q='+word);assert.equal(r.data.total,0,`search "${word}" leaked a hidden product`);
  }
  const crochet=await list('q=crochet&limit=48');
  assert.equal(crochet.data.total,6,'every visible product mentions crochet; hidden ones must not add to the count');
});
test('direct detail access to hidden/unpublished/archived/moderated/suspended/scheduled products is a 404 identical to an unknown id',async()=>{
  const unknown=await call('/api/shop/catalogue/products/9999');
  assert.equal(unknown.status,404);assert.deepEqual(unknown.data,{status:'error',message:'Product not found'});
  for(const id of Object.keys(HIDDEN)){
    const r=await call('/api/shop/catalogue/products/'+id);
    assert.equal(r.status,404,`${HIDDEN[id]} must not be reachable`);
    assert.deepEqual(r.data,unknown.data,`${HIDDEN[id]} 404 body must not differ from an unknown product`);
    // even with a variant selection, the response stays an indistinguishable 404
    const withVariant=await call(`/api/shop/catalogue/products/${id}?variant=101`);
    assert.equal(withVariant.status,404);assert.deepEqual(withVariant.data,unknown.data);
  }
});
test('public PRD deep links reuse the catalogue detail model and server-confirmed variants',async()=>{
  const code='PRD-AAAAAAAAAAAA';
  const detail=await call(`/api/shop/catalogue/products/${code}`);
  assert.equal(detail.status,200);
  assert.equal(detail.data.product.name,'Tote Bag');
  assert.equal(detail.data.product.images.length,4,'gallery includes parent and active variant images');
  assert.equal(detail.data.product.variants.length,3,'active and inactive variants remain subject to the standard chooser/validator');
  assertNoInternalIdentity(detail.data,'public-code detail');
  assert.ok(detail.queries.some(q=>q.sql.includes('FROM howdi_public_refs')&&q.params[0]===code),'public code is resolved server-side');
  const selected=await call(`/api/shop/catalogue/products/${code}?variant=101`);
  assert.equal(selected.status,200);
  assert.equal(selected.data.product.selection.id,'101');
  assert.equal(selected.data.product.selection.price.current,999);
  assert.equal(selected.data.product.selection.availability.inStock,true);
  assert.equal((await call(`/api/shop/catalogue/products/${code}?variant=103`)).status,404,'inactive variant cannot be selected through a public code');
  assert.equal((await call(`/api/shop/catalogue/products/${code}?variant=201`)).status,404,'another product variant cannot be selected through a public code');
  const hidden=await call('/api/shop/catalogue/products/PRD-BBBBBBBBBBBB');
  assert.equal(hidden.status,404,'a public code cannot bypass catalogue visibility');
  assert.deepEqual(hidden.data,{status:'error',message:'Product not found'});
  const unknown=await call('/api/shop/catalogue/products/PRD-CCCCCCCCCCCC');
  assert.deepEqual(unknown.data,hidden.data,'hidden and unknown public codes are indistinguishable');
  const malformed=await call('/api/shop/catalogue/products/PRD-not-a-code');
  assert.equal(malformed.status,400);
  assert.equal(malformed.queries.length,0);
});
test('related products and the category tree never include hidden products',async()=>{
  // Draft Basket / Rejected Rug share category or creator with visible products, so they would be picked up if the gate leaked.
  for(const id of [1,2,10,11,12,13]){
    const r=await call('/api/shop/catalogue/products/'+id);assert.equal(r.status,200);
    const rel=r.data.product.related.map(p=>p.name);
    for(const hidden of Object.values(HIDDEN))assert.ok(!rel.includes(hidden),`${hidden} leaked into related of ${id}`);
    assert.ok(!r.data.product.related.some(p=>p.id===String(id)),'a product is never related to itself');
  }
  const tote=(await call('/api/shop/catalogue/products/1')).data.product;
  assert.deepEqual(tote.related.map(p=>p.name).sort(),['Approved Pouch','Cream Clutch','Offer Bag']);
  const tree=await call('/api/shop/catalogue');
  assert.equal(tree.status,200);
  assert.deepEqual(tree.data.categories.map(c=>[c.name,c.count]),[['Bags',4],['Home',2]]);
  const text=JSON.stringify(tree.data);
  for(const cat of ['Accessories','Toys','Rugs','Baskets','Hats','Scarves','Shawls','Amigurumi'])assert.ok(!text.includes(cat),`category tree leaked hidden-only category ${cat}`);
});
test('when the moderation table does not exist yet the catalogue still works and still hides drafts/archived/suspended/scheduled',async()=>{
  const db=seed();db.moderationTable=false;
  const r=await list('limit=48',{db});
  const got=names(r);
  for(const n of ['Draft Basket','Archived Hat','Hidden Scarf','Suspended Toy','Scheduled Shawl'])assert.ok(!got.includes(n),n+' leaked without moderation table');
  assert.ok(got.includes('Tote Bag'));
  assert.ok(r.queries.some(q=>q.sql.includes('howdi_shop_product_moderation_v162c')),'first attempt uses the moderation table');
  assert.ok(r.queries.some(q=>!q.sql.includes('howdi_shop_product_moderation_v162c')&&q.sql.includes('FROM vendor_products p')),'fallback query without the moderation table ran');
});
test('database failures return a generic 500 without leaking the error text',async()=>{
  const db=seed();db.failWith='connection to db.internal.example:5432 refused password=hunter2';
  for(const route of ['/api/shop/catalogue/products','/api/shop/catalogue/products/1','/api/shop/catalogue']){
    const r=await call(route,{db});
    assert.equal(r.status,500);
    assert.doesNotMatch(JSON.stringify(r.data),/db\.internal|hunter2|5432/);
    assert.equal(r.data.status,'error');
  }
});

// ---------- validation ----------
test('list route rejects invalid or unsupported parameters with 400 before touching the database',async()=>{
  const bad=[
    'sort=oldest','sort=price','sort=NEWEST','sort=relevance','sort=newest;DROP TABLE x','limit=0','limit=49','limit=abc','limit=1e2','limit=-5','limit=10&limit=20',
    'offset=-1','offset=abc','offset=10001','offset=1.5','minPrice=-1','minPrice=abc','minPrice=1e3','minPrice=1.234','maxPrice=NaN','maxPrice=Infinity',
    'minPrice=500&maxPrice=100','inStock=yes','inStock=2','creator=bad name','creator=a;b','creator='+'x'.repeat(61),'q='+'x'.repeat(81),'category='+'x'.repeat(121),
    'colour='+'x'.repeat(121),'material='+'x'.repeat(121),'subcategory='+'x'.repeat(121),'foo=bar','userId=1','vendorId=9','vendor=HOWDI-VND-000777','status=draft','includeHidden=true','archived=1','q=a&q=b'
  ];
  for(const qs of bad){
    const r=await call('/api/shop/catalogue/products?'+qs);
    assert.equal(r.status,400,`expected 400 for "${qs}", got ${r.status}`);
    assert.equal(r.data.status,'error');
    assert.equal(r.queries.length,0,`invalid query "${qs}" must be rejected before any SQL runs`);
  }
});
test('valid parameters are accepted and echoed in a normalised form',async()=>{
  const r=await list('q=%20tote%20&category=Bags&minPrice=100.50&maxPrice=1000&inStock=1&sort=price_asc&limit=5&offset=0');
  assert.equal(r.data.limit,5);assert.equal(r.data.sort,'price_asc');
  assert.equal(r.data.filters.q,'tote');assert.equal(r.data.filters.minPrice,100.5);assert.equal(r.data.filters.maxPrice,1000);assert.equal(r.data.filters.inStock,true);
  assert.equal((await list('q=tote')).data.sort,'relevance','a search term defaults to relevance');
  assert.equal((await list('')).data.sort,'newest');
  for(const sort of ['newest','price_asc','price_desc'])assert.equal((await list('sort='+sort)).data.sort,sort);
  assert.equal((await list('q=tote&sort=relevance')).data.sort,'relevance');
});
test('hostile filter text is only ever data: never placed into SQL, never crashes',async()=>{
  const evil="' OR 1=1 --";
  const r=await list('q='+encodeURIComponent(evil)+'&category='+encodeURIComponent(evil)+'&colour='+encodeURIComponent(evil));
  assert.equal(r.data.total,0);
  for(const q of r.queries){assert.ok(!q.sql.includes('OR 1=1'));assert.ok(!JSON.stringify(q.params).includes('OR 1=1'));}
});
test('detail route validates product id and selection parameters',async()=>{
  for(const id of ['abc','1.5','-1','1e3','0x10','1234567890123456789','%20']){
    const r=await call('/api/shop/catalogue/products/'+id);assert.equal(r.status,400,`id "${id}"`);assert.equal(r.queries.length,0);
  }
  for(const qs of ['variant=abc','variant=-1','variant=1.5','variant=101&variant=104','colour=Red&colour=Blue','foo=bar','userId=1','colour='+'x'.repeat(121),'size='+'x'.repeat(121),'variant=101&colour=Red&extra=1']){
    const r=await call('/api/shop/catalogue/products/1?'+qs);assert.equal(r.status,400,`selection "${qs}"`);
  }
});

// ---------- filters ----------
test('category and subcategory filters (case-insensitive) narrow the grid',async()=>{
  assert.deepEqual(await listNames('category=bags'),['Approved Pouch','Offer Bag','Cream Clutch','Tote Bag']);
  assert.deepEqual(await listNames('category=Home'),['Sold Out Throw','Inactive Variants Blanket']);
  assert.deepEqual(await listNames('category=Bags&subcategory=TOTES'),['Offer Bag','Tote Bag']);
  assert.deepEqual(await listNames('category=Home&subcategory=Totes'),[]);
  assert.deepEqual(await listNames('category=Accessories'),[],'a hidden-only category has no visible products');
  assert.deepEqual(await listNames('subcategory=Rugs'),[]);
});
test('colour filter matches active variants only; declared colours are used when a product has no variants',async()=>{
  assert.deepEqual(await listNames('colour=red'),['Tote Bag']);
  assert.deepEqual(await listNames('colour=Blue'),['Tote Bag']);
  assert.deepEqual(await listNames('colour=Green'),[],'the Green variant is inactive');
  assert.deepEqual(await listNames('colour=Grey'),[],'inactive variants of the blanket do not count');
  assert.deepEqual(await listNames('colour=cream'),['Cream Clutch']);
  assert.deepEqual(await listNames('colour=purple'),[]);
});
test('material filter uses stored materials',async()=>{
  assert.deepEqual(await listNames('material=wool'),['Sold Out Throw']);
  assert.deepEqual(await listNames('material=COTTON%20YARN'),['Tote Bag']);
  assert.deepEqual(await listNames('material=silk'),[]);
});
test('price filter applies to the customer price (vendor offer included) and to a single variant',async()=>{
  assert.deepEqual(await listNames('minPrice=900&maxPrice=1000'),['Offer Bag','Tote Bag'],'Offer Bag lists at 1000 but sells at 900');
  assert.deepEqual(await listNames('maxPrice=500'),['Approved Pouch','Cream Clutch']);
  assert.deepEqual(await listNames('minPrice=2000'),['Sold Out Throw','Inactive Variants Blanket']);
  assert.deepEqual(await listNames('minPrice=2500&maxPrice=2500'),['Sold Out Throw']);
  assert.deepEqual(await listNames('minPrice=10000'),[]);
  // Tote: Red M 999, Red L 989 (in stock), Blue M 1099 (sold out). >=1000 only Blue satisfies, but Blue is out of stock.
  assert.deepEqual(await listNames('minPrice=1000'),['Sold Out Throw','Inactive Variants Blanket','Tote Bag']);
  assert.deepEqual(await listNames('minPrice=1000&inStock=true'),[],'one variant must satisfy price AND stock together');
});
test('inStock filter is variant-authoritative: parent stock never rescues inactive/sold-out variants',async()=>{
  assert.deepEqual(await listNames('inStock=true'),['Approved Pouch','Offer Bag','Cream Clutch','Tote Bag']);
  assert.ok(!(await listNames('inStock=true')).includes('Inactive Variants Blanket'),'parent stock is 50 but every variant is inactive');
  assert.ok(!(await listNames('inStock=true')).includes('Sold Out Throw'));
  assert.deepEqual(await listNames('colour=Blue&inStock=true'),[],'the only Blue variant has 0 stock');
  assert.deepEqual(await listNames('colour=Red&inStock=true'),['Tote Bag']);
  assert.deepEqual(await listNames('material=wool&inStock=true'),[]);
  assert.equal((await list('inStock=false')).data.total,6);
});
test('creator filter uses the public username only',async()=>{
  assert.deepEqual(await listNames('creator=asha_crochet'),['Approved Pouch','Cream Clutch','Tote Bag']);
  assert.deepEqual(await listNames('creator=ASHA_CROCHET'),['Approved Pouch','Cream Clutch','Tote Bag']);
  assert.deepEqual(await listNames('creator=nobody'),[]);
});
test('facets reflect only visible, active data and stay consistent with active filters',async()=>{
  const f=(await list()).data.facets;
  assert.deepEqual(f.categories.map(c=>[c.name,c.count]),[['Bags',4],['Home',2]]);
  assert.deepEqual(f.categories[0].subcategories.map(s=>[s.name,s.count]),[['Clutches',1],['Pouches',1],['Totes',2]]);
  assert.deepEqual(f.colours.map(c=>c.name),['Blue','Cream','Red'],'Green (inactive) must not be offered');
  assert.deepEqual(f.materials.map(m=>m.name),['Cotton yarn','Wool']);
  assert.deepEqual(f.price,{min:350,max:2500});
  const bags=(await list('category=Bags')).data.facets;
  assert.deepEqual(bags.categories.map(c=>c.name),['Bags','Home'],'category facet ignores the category filter so the user can switch');
  assert.deepEqual(bags.materials.map(m=>m.name),['Cotton yarn'],'other facets honour the category filter');
});

// ---------- sorting + paging ----------
test('sorting: newest, price low→high, price high→low, relevance',async()=>{
  assert.deepEqual(await listNames('sort=newest'),['Approved Pouch','Offer Bag','Sold Out Throw','Inactive Variants Blanket','Cream Clutch','Tote Bag']);
  assert.deepEqual(await listNames(''),await listNames('sort=newest'),'newest is the default');
  assert.deepEqual(await listNames('sort=price_asc'),['Approved Pouch','Cream Clutch','Offer Bag','Tote Bag','Inactive Variants Blanket','Sold Out Throw']);
  assert.deepEqual(await listNames('sort=price_desc'),['Sold Out Throw','Inactive Variants Blanket','Tote Bag','Offer Bag','Cream Clutch','Approved Pouch']);
  assert.deepEqual(await listNames('q=tote'),['Tote Bag','Offer Bag'],'name match outranks a subcategory-only match');
  assert.deepEqual(await listNames('q=tote&sort=newest'),['Offer Bag','Tote Bag']);
  assert.deepEqual(await listNames('q=tote&sort=price_asc'),['Offer Bag','Tote Bag']);
  const rel=await call('/api/shop/catalogue/products?sort=relevance');assert.equal(rel.status,400);
});
test('search matches names, materials, colours and creators; multiple words must all match',async()=>{
  assert.deepEqual(await listNames('q=wool'),['Sold Out Throw']);
  assert.deepEqual(await listNames('q=cream'),['Cream Clutch']);
  assert.deepEqual(await listNames('q=bina'),['Offer Bag','Sold Out Throw','Inactive Variants Blanket']);
  assert.deepEqual(await listNames('q=tote%20bag'),['Tote Bag','Offer Bag'],'both words match Offer Bag (Bag in name, Totes subcategory) but Tote Bag ranks first');
  assert.deepEqual(await listNames('q=tote%20wool'),[]);
});
test('pagination: limit/offset/hasMore/total are consistent',async()=>{
  const p1=await list('limit=4&offset=0');const p2=await list('limit=4&offset=4');
  assert.equal(p1.data.total,6);assert.equal(p1.data.count,4);assert.equal(p1.data.hasMore,true);
  assert.equal(p2.data.count,2);assert.equal(p2.data.hasMore,false);
  assert.deepEqual([...names(p1),...names(p2)],await listNames('limit=48'));
  assert.equal((await list('offset=100')).data.count,0);
});

// ---------- variants + availability ----------
test('variant stock is authoritative: only active variants appear and drive availability',async()=>{
  const r=await call('/api/shop/catalogue/products/1');assert.equal(r.status,200);
  const p=r.data.product;
  assert.deepEqual(p.variants.map(v=>v.id),['101','104','102'],'inactive Green (103) is not exposed');
  const byId=Object.fromEntries(p.variants.map(v=>[v.id,v]));
  assert.equal(byId['101'].availability.state,'low_stock');assert.equal(byId['101'].availability.label,'Only 5 left');assert.equal(byId['101'].stock,5);
  assert.equal(byId['104'].availability.label,'Only 3 left');
  assert.equal(byId['102'].availability.state,'out_of_stock');assert.equal(byId['102'].stock,0);assert.equal(byId['102'].availability.inStock,false);
  assert.equal(p.availability.state,'in_stock');
  assert.deepEqual(p.colours,['Red','Blue']);assert.deepEqual(p.sizes,['M','L']);
  assert.equal(p.price.current,989,'headline price is the cheapest variant that can actually be bought');
  assert.equal(p.price.original,1189);assert.equal(p.price.discountPercent,17);assert.equal(p.price.onSale,true);
});
test('a product whose variants are all inactive is out of stock — parent stock is never a fallback',async()=>{
  const r=await call('/api/shop/catalogue/products/10');assert.equal(r.status,200);
  const p=r.data.product;
  assert.equal(p.availability.state,'out_of_stock');assert.equal(p.availability.inStock,false);
  assert.deepEqual(p.variants,[]);assert.deepEqual(p.colours,[]);
  const card=(await list('category=Home')).data.products.find(x=>x.id==='10');
  assert.equal(card.availability.state,'out_of_stock');
  assert.equal((await call('/api/shop/catalogue/products/10?variant=201')).status,404,'inactive variant cannot be selected');
});
test('a product with no variant rows uses its own stock (and low-stock threshold)',async()=>{
  const clutch=(await call('/api/shop/catalogue/products/2')).data.product;
  assert.equal(clutch.availability.state,'low_stock');assert.deepEqual(clutch.variants,[]);assert.deepEqual(clutch.colours,['Cream']);
  const pouch=(await call('/api/shop/catalogue/products/13')).data.product;assert.equal(pouch.availability.state,'in_stock');
  const throwRug=(await call('/api/shop/catalogue/products/11')).data.product;assert.equal(throwRug.availability.state,'out_of_stock');
});
test('a vendor offer lowers the customer price and shows the original',async()=>{
  const p=(await call('/api/shop/catalogue/products/12')).data.product;
  assert.equal(p.price.current,900);assert.equal(p.price.original,1000);assert.equal(p.price.discountPercent,10);assert.equal(p.price.onSale,true);
  const plain=(await call('/api/shop/catalogue/products/13')).data.product;assert.equal(plain.price.onSale,false);assert.equal(plain.price.original,null);
});
test('variant selection is validated server-side: by id, by colour+size, ambiguity, inactive and unknown',async()=>{
  const ok=await call('/api/shop/catalogue/products/1?variant=101');
  assert.equal(ok.status,200);assert.equal(ok.data.product.selection.id,'101');assert.equal(ok.data.product.selection.colour,'Red');assert.equal(ok.data.product.selection.stock,5);
  const sold=await call('/api/shop/catalogue/products/1?variant=102');
  assert.equal(sold.status,200);assert.equal(sold.data.product.selection.availability.state,'out_of_stock');assert.equal(sold.data.product.selection.stock,0);
  const both=await call('/api/shop/catalogue/products/1?colour=red&size=l');
  assert.equal(both.status,200);assert.equal(both.data.product.selection.id,'104');
  const sizeOnly=await call('/api/shop/catalogue/products/1?size=M');
  assert.equal(sizeOnly.status,400,'Red M and Blue M both match');
  const colourOnly=await call('/api/shop/catalogue/products/1?colour=Red');
  assert.equal(colourOnly.status,400,'Red M and Red L both match — must choose a size');
  const blueOnly=await call('/api/shop/catalogue/products/1?colour=Blue');
  assert.equal(blueOnly.status,200);assert.equal(blueOnly.data.product.selection.id,'102');
  assert.equal((await call('/api/shop/catalogue/products/1?variant=103')).status,404,'inactive variant');
  assert.equal((await call('/api/shop/catalogue/products/1?colour=Green&size=L')).status,404,'inactive variant by attributes');
  assert.equal((await call('/api/shop/catalogue/products/1?variant=999')).status,404,'unknown variant');
  assert.equal((await call('/api/shop/catalogue/products/1?variant=201')).status,404,"another product's variant");
  assert.equal((await call('/api/shop/catalogue/products/2?colour=Cream')).status,404,'product without variant rows has nothing to select');
  assert.equal((await call('/api/shop/catalogue/products/1')).data.product.selection,null);
});

// ---------- public payload shape / privacy ----------
test('no internal identity fields or values in any Shop catalogue response',async()=>{
  const payloads=[
    ['list',(await list('limit=48')).data],['search',(await list('q=tote')).data],['creator',(await list('creator=asha_crochet')).data],
    ['tree',(await call('/api/shop/catalogue')).data]
  ];
  for(const id of [1,2,10,11,12,13])payloads.push(['detail '+id,(await call('/api/shop/catalogue/products/'+id)).data]);
  payloads.push(['selection',(await call('/api/shop/catalogue/products/1?variant=101')).data]);
  for(const [label,p] of payloads)assertNoInternalIdentity(p,label);
});
test('public creator identity is exactly public_username + display_name + avatar',async()=>{
  const r=await list('limit=48');
  for(const p of r.data.products)assert.deepEqual(Object.keys(p.creator).sort(),['avatar','display_name','public_username'],p.name);
  const d=(await call('/api/shop/catalogue/products/1')).data.product;
  assert.deepEqual(Object.keys(d.creator).sort(),['avatar','display_name','public_username']);
  assert.deepEqual(d.creator,{public_username:'asha_crochet',display_name:'Asha Crochet Studio',avatar:'data:image/png;base64,QUFB'});
  const bina=r.data.products.find(p=>p.name==='Offer Bag').creator;
  assert.equal(bina.public_username,null,'a creator without a public username exposes null, never an internal id');
  assert.equal(bina.display_name,'Bina Handloom');
  for(const p of [...r.data.products,d]){for(const rel of p.related||[])assert.deepEqual(Object.keys(rel.creator).sort(),['avatar','display_name','public_username']);}
});
test('creator avatars are sanitised: javascript: URLs dropped, oversized inline images dropped on cards',async()=>{
  const cards=Object.fromEntries((await list('limit=48')).data.products.map(p=>[p.name,p]));
  assert.equal(cards['Offer Bag'].creator.avatar,'');
  assert.equal(cards['Sold Out Throw'].creator.avatar,'','40k data URI is too large for a card');
  const detail=(await call('/api/shop/catalogue/products/11')).data.product;
  assert.ok(detail.creator.avatar.startsWith('data:image/png;base64,'),'detail allows a larger avatar');
  assert.equal((await call('/api/shop/catalogue/products/12')).data.product.creator.avatar,'');
});
test('reviews: no source exists, so every card and detail says "No reviews yet" — no invented ratings',async()=>{
  const r=await list('limit=48');
  for(const p of r.data.products)assert.deepEqual(p.reviews,{count:0,average:null,label:'No reviews yet'});
  assert.deepEqual((await call('/api/shop/catalogue/products/1')).data.product.reviews,{count:0,average:null,label:'No reviews yet'});
  for(const p of r.data.products){assert.ok(!('rating' in p));assert.ok(!('vendor' in p));}
});
test('card and detail payloads are allow-lists (raw rows never pass through)',async()=>{
  const card=(await list('limit=1')).data.products[0];
  assert.deepEqual(Object.keys(card).sort(),['availability','category','colours','creator','id','image','materials','name','price','productType','publishedAt','reviews','shortDescription','slug','subcategory'].sort());
  const detail=(await call('/api/shop/catalogue/products/1')).data.product;
  for(const k of Object.keys(detail))assert.ok(!['raw','row','sku','vendor','status','archived_at','moderation_status','stock','mrp'].includes(k),`unexpected detail field ${k}`);
  assert.equal(typeof detail.id,'string');assert.match(detail.id,/^\d+$/,'product ids are allowed content ids');
});
test('every S1 response is JSON only and only GET routes exist under /api/shop/catalogue',async()=>{
  assert.ok(/req\.method === "GET" && pathname === "\/api\/shop\/catalogue\/products"/.test(source));
  assert.ok(/req\.method === "GET" && shopS1DetailMatch/.test(source));
  assert.ok(!/(POST|PUT|PATCH|DELETE)[^\n]{0,80}\/api\/shop\/catalogue/.test(source),'catalogue must be read-only');
  for(const method of ['POST','DELETE']){
    const u=new URL('/api/shop/catalogue/products','http://shop.test');
    const out=await vm.runInNewContext(attachSrc+'\n(async()=>{'+shopSrc+'})()',{pool:{query:async()=>{throw new Error('db touched')}},req:{method,headers:{}},res:{},url:u,pathname:u.pathname,URL,Buffer,console,clean:x=>String(x??'').trim(),sendJSON:(_r,status,data)=>({status,data})});
    assert.equal(out,undefined,method+' must not be handled by the catalogue');
  }
});

// ---------- legacy public shop APIs (still used by the Shop home) ----------
test('legacy /api/shop/products, detail and slug routes use the same visibility gate',async()=>{
  const r=await call('/api/shop/products?limit=100');assert.equal(r.status,200);
  assert.deepEqual(r.data.products.map(p=>p.name).sort(),[...VISIBLE_NAMES].sort());
  for(const id of Object.keys(HIDDEN)){
    assert.equal((await call('/api/shop/products/'+id)).status,404,'legacy detail '+HIDDEN[id]);
    const slug=HIDDEN[id].toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+id;
    assert.equal((await call('/api/shop/product/'+slug)).status,404,'legacy slug '+HIDDEN[id]);
  }
  assert.equal((await call('/api/shop/products/1')).status,200);
  assert.equal((await call('/api/shop/product/tote-bag-1')).status,200);
});
test('legacy payload no longer exposes vendor ids/codes and exposes public creator identity',async()=>{
  const r=await call('/api/shop/products?limit=100');
  assertNoInternalIdentity(r.data,'legacy list');
  for(const p of r.data.products){
    assert.deepEqual(Object.keys(p.vendor).sort(),['businessName','city','rating','state','verified']);
    assert.deepEqual(Object.keys(p.creator).sort(),['avatar','display_name','public_username']);
  }
  assertNoInternalIdentity((await call('/api/shop/products/1')).data,'legacy detail');
});
test('legacy payload also treats variant stock as authoritative',async()=>{
  const blanket=(await call('/api/shop/products/10')).data.product;
  assert.equal(blanket.stock,0);assert.equal(blanket.inStock,false);assert.deepEqual(blanket.variants,[]);
  const tote=(await call('/api/shop/products/1')).data.product;
  assert.equal(tote.stock,8,'active variants only: 5 + 3 + 0 (parent stock 100 ignored, inactive Green ignored)');
  const clutch=(await call('/api/shop/products/2')).data.product;assert.equal(clutch.stock,4);
});

// ---------- static SQL / source pins (the double cannot execute SQL) ----------
test('SQL pins: the catalogue and legacy loaders gate on published, non-archived, released, active-vendor, approved rows',async()=>{
  for(const [label,src] of [['S1 loader',loaderSrc],['legacy loader',legacyRowsSrc]]){
    assert.match(src,/p\.status='published'/,label);
    assert.match(src,/p\.archived_at IS NULL/,label);
    assert.match(src,/\(p\.published_at IS NULL OR p\.published_at<=NOW\(\)\)/,label);
    assert.match(src,/COALESCE\(v\.status,'active'\)='active'/,label);
    assert.match(src,/COALESCE\(UPPER\(\$\{SHOP_S1_MODERATION_SQL\}\),'APPROVED'\)='APPROVED'/,label);
    assert.match(src,/42P01/,label+' handles a missing moderation table');
    assert.match(src,/\.filter\(shopS1RowVisible\)/,label+' re-checks visibility in JS');
  }
  const mod=between('const SHOP_S1_MODERATION_SQL','\n    const ').replace(/\s+/g,' ');
  assert.match(mod,/howdi_shop_product_moderation_v162c/);assert.match(mod,/ORDER BY[^)]*created_at DESC/);assert.match(mod,/LIMIT 1/);
});
test('SQL pins: the S1 SELECT never reads vendor/user/owner identity columns',async()=>{
  const selectList=loaderSrc.slice(loaderSrc.indexOf('SELECT p.id'),loaderSrc.indexOf('FROM vendor_products p'));
  assert.ok(selectList.length>200);
  for(const col of ['vendor_profile_id','vendor_code','user_id','howdi_id','owner','seller','kyc','SELECT *','p.*'])assert.ok(!selectList.includes(col),`S1 SELECT list must not include ${col}`);
  assert.ok(!/\bp\.\*/.test(loaderSrc),'no p.* in the S1 loader');
});
test('SQL pins: S1 is read-only, has no demo-product fallback and never adds purchase behaviour',async()=>{
  assert.doesNotMatch(s1Block,/\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|TRUNCATE|ALTER\s+TABLE|CREATE\s+TABLE)\b/i);
  assert.doesNotMatch(s1Block,/fallbackProducts|demoProducts|sampleProducts|Math\.random/);
  assert.doesNotMatch(s1Block,/cart|wishlist|coupon|checkout|payment|refund|razorpay/i);
  assert.match(s1Block,/SHOP_S1_CANDIDATE_CAP\s*=\s*1000/);
});

// ---------- frontend source-pattern tests (no JSX test harness exists in this repo) ----------
test('UI: loading, error and empty states exist and are announced',async()=>{
  assert.match(jsx,/role="status"[^>]*aria-live="polite"[^>]*aria-busy="true"/,'loading skeleton is a busy live region');
  assert.match(jsx,/Loading products/);
  assert.match(jsx,/role=\{kind === "error" \? "alert" : "status"\}/,'errors use role=alert, everything else role=status');
  assert.match(jsx,/We couldn't load products/);assert.match(jsx,/We couldn't load this product/);
  assert.equal((jsx.match(/actionLabel="Try again" onAction=\{\(\) => setReloadKey\(\(k\) => k \+ 1\)\}/g)||[]).length,2,'both the list error and the detail error offer a working retry');
  assert.match(jsx,/No products match your filters/);assert.match(jsx,/actionLabel="Clear filters"/);
  assert.match(jsx,/No products are listed yet/);
  assert.match(jsx,/This product isn't available/,'404 detail state');
  assert.match(jsx,/status: "error"[\s\S]{0,200}message: error\.message/,'list error state carries the message');
});
test('UI: product cards, chips and controls are real buttons with accessible names and keyboard support',async()=>{
  assert.match(jsx,/<button type="button" className="sc-card-open"[^>]*onClick=\{\(\) => onOpen\(product\.id\)\}[^>]*aria-label=\{`View \$\{product\.name\}/);
  assert.doesNotMatch(jsx,/<(div|li|article|span|p|img)\b[^>]*\bonClick=/,'no click handlers on non-interactive elements');
  const buttons=jsx.match(/<button\b[^>]*>/g)||[];
  assert.ok(buttons.length>=15);
  for(const b of buttons)assert.match(b,/type=(?:"button"|"submit")|type="button"/,'every button declares its type: '+b.slice(0,80));
  assert.match(jsx,/aria-pressed=/);assert.match(jsx,/aria-expanded=\{filtersOpen\}/);assert.match(jsx,/aria-controls="sc-filters"/);
  assert.match(jsx,/event\.key === "Escape"/,'Escape leaves the detail view');
  assert.match(jsx,/\.focus\(/,'focus is moved to the detail heading and returned to the opened card');
  assert.match(jsx,/tabIndex=\{-1\}/);
  assert.match(jsx,/role="search"/);assert.match(jsx,/htmlFor="sc-search-input"/);
  for(const img of jsx.match(/<img\b[^>]*>/g)||[])assert.match(img,/\balt=/,'image without alt: '+img.slice(0,60));
  assert.match(css,/:focus-visible/);assert.match(css,/min-height:44px/);
});
test('UI: no demo fallback, no purchase behaviour, only the public catalogue endpoints',async()=>{
  const code=jsx.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  assert.doesNotMatch(code,/fallbackProducts|demoProducts|sampleProducts|Math\.random|localStorage|sessionStorage/);
  // Shop S2 actions are callbacks; the catalogue must not call cart/order/checkout or payment-provider APIs itself.
  assert.doesNotMatch(code,/razorpay|fetchJson\([^)]*\/api\/(?:cart|orders|checkout)|\b(?:coupon|payment)\s*:/i);
  const apis=code.match(/\/api\/[A-Za-z0-9/_${}.-]+/g)||[];
  assert.ok(apis.length>=3);
  for(const a of apis)assert.match(a,/^\/api\/shop\/catalogue\/products/,'unexpected endpoint '+a);
  assert.match(jsx,/reviews\.count > 0 && reviews\.average != null/,'stars are only drawn from real review data');
  assert.match(jsx,/No reviews yet/);
  assert.match(jsx,/catch \{ body = null; \}/);
});
test('UI: filters, sorts and states cover the requested discovery flow',async()=>{
  for(const label of ['Newest','Price: low to high','Price: high to low','Relevance'])assert.ok(jsx.includes(label),label);
  for(const key of ['"category"','"subcategory"','"colour"','"material"','"minPrice"','"maxPrice"','"creator"'])assert.ok(jsx.includes(key),key);
  assert.match(jsx,/In stock only/);assert.match(jsx,/Load more/);assert.match(jsx,/You may also like/);
  assert.match(jsx,/variant=\$\{encodeURIComponent\(selectedVariant\.id\)\}/,'selected variants are confirmed with the server');
  assert.match(jsx,/AbortController/,'in-flight requests are cancelled');
});
test('UI: styles are scoped to .sc- and the layout is mobile-safe',async()=>{
  const selectors=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/(^|\})\s*([^{}@]+)\{/g)].map(m=>m[2].trim()).filter(s=>s&&!/^\d+%$/.test(s)&&!/^(from|to)$/.test(s));
  assert.ok(selectors.length>40);
  for(const group of selectors)for(const s of group.split(','))assert.match(s.trim(),/^\.sc-/,'unscoped selector: '+s.trim());
  assert.match(css,/@media \(max-width:860px\)/);assert.match(css,/@media \(max-width:520px\)/);
  assert.match(css,/prefers-reduced-motion/);
});
test('App wiring: the V8 public product route mounts the shared catalogue detail with validated Shop actions',async()=>{
  assert.match(app,/import ShopCatalogue from \"\.\/components\/ShopCatalogue\";/);
  assert.match(app,/v8ShopPath\.slice\(\"products\/\"\.length\)/,'public PRD code is forwarded as the catalogue detail key');
  assert.match(app,/ShopCatalogue apiBase=\{SHOP_API_BASE\} v8/);
  assert.match(app,/onAddToCart=\{addCatalogueLineToCart\} onBuyNow=\{buyCatalogueLine\}/);
  assert.ok(app.includes('!/^products\\/PRD-[0-9A-F]{12}$/.test(v8ShopPath)'), 'bag/orders keep using the existing V8 purchase routes');
  assert.ok(app.includes('ShopCatalogue apiBase={SHOP_API_BASE} v8'), 'canonical catalogue is mounted for the direct route');
  assert.match(app,/openNavigationOSArea\("shop",String\(p\|\|"home"\)\)/);
});
