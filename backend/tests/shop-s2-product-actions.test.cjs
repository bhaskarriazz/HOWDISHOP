// Shop S2 — Product Actions & Purchase-Path Integrity: hermetic regression tests.
// Like the S1 suite this evaluates the REAL helper/route source extracted from server.js in a vm (no PostgreSQL,
// no server). The end-to-end behaviour over real HTTP + SQL is covered by backend/tests/shop-s2-pg/.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8').replace(/\r\n/g,'\n');
const read=(p)=>fs.readFileSync(path.join(__dirname,p),'utf8').replace(/\r\n/g,'\n');
const app=read('../../apps/customer/src/App.jsx');
const catalogue=read('../../apps/customer/src/components/ShopCatalogue.jsx');
const actionsJsx=read('../../apps/customer/src/components/ShopProductActions.jsx');
const actionsCss=read('../../apps/customer/src/components/ShopProductActions.css');
function between(a,b){const s=source.indexOf(a);assert.notEqual(s,-1,a);const e=source.indexOf(b,s+a.length);assert.notEqual(e,-1,b);return source.slice(s,e);}

const helpersSrc=between('    const SHOP_S1_MODERATION_SQL =','    // ---- strict query validation ----');
const offerSrc=between('    function activeVendorOfferForCustomer(row){','    function customerProductPayload(');
const modelSrc=between('    // ---- product model: single source of truth','    // ---- filtering / sorting / search ----');
const resolverSrc=between('    function shopS2Resolve(','    // ---- cart validation (public');
const parserSrc=between('    function parseShopCartValidate(body) {','    function shopS2CartLine(');
const s2Block=between('    // HOWDI SHOP S2 — PRODUCT ACTIONS','    // Public customer catalogue — no login required.');
const purchaseSrc=between('            // Shop S2: quote and order share ONE resolver','            async function getVendorDeliveryPreference(');
const guardSrc=between('    const SHOP_V162_PUBLIC_READS=[','    async function howdiDispatchAppRouteR2(req,res){');

const lib=vm.runInNewContext(
  ['const SHOP_S2_MAX_CART_LINES=30,SHOP_S2_MAX_QTY=99,SHOP_S2_ID=/^\\d{1,18}$/;',helpersSrc,offerSrc,modelSrc,resolverSrc,parserSrc,
   '({shopS2Resolve,shopS1Model,shopS1RowVisible,parseShopCartValidate,activeVendorOfferForCustomer})'].join('\n'),{Date,Math,Number,String,Array,Object,Set,Map,JSON,RegExp,Boolean});

const NOW=Date.now();
const iso=(ms)=>new Date(NOW+ms).toISOString();
function row(over={}){
  return {id:1,name:'Tote',status:'published',archived_at:null,vendor_status:'active',published_at:iso(-86400000),moderation_status:null,
    price:1000,mrp:0,stock:5,low_stock_threshold:5,vendor_offer_enabled:false,vendor_offer_type:null,vendor_offer_value:null,vendor_offer_start:null,vendor_offer_end:null,
    variant_options:{},image_urls:[],materials:[],highlights:[],specifications:{},size_chart:[],business_name:'Studio',creator_public_username:'asha',...over};
}
function variant(id,over={}){return {id,product_id:1,colour:'Red',size_value:'M',mrp:0,price:800,stock:3,low_stock_threshold:5,image_urls:[],status:'active',sort_order:0,...over};}
const resolve=(r,vs,o)=>lib.shopS2Resolve(r,vs,o);

// ---------- visibility gate ----------
test('resolver applies the SAME visibility gate as the catalogue (published, not archived, released, active vendor, not moderated away)',()=>{
  assert.equal(resolve(row(),[],{quantity:1}).ok,true);
  const hidden={draft:{status:'draft'},hidden:{status:'hidden'},archived:{archived_at:iso(-1000)},suspendedVendor:{vendor_status:'suspended'},
    scheduled:{published_at:iso(86400000*30)},rejected:{moderation_status:'REJECTED'},pending:{moderation_status:'PENDING'},suspendedMod:{moderation_status:'SUSPENDED'}};
  for(const [label,over] of Object.entries(hidden)){
    const r=resolve(row(over),[],{quantity:1});
    assert.equal(r.ok,false,label);assert.equal(r.code,'UNAVAILABLE',label);
    assert.equal(lib.shopS1RowVisible(row(over)),false,`${label}: catalogue agrees`);
  }
  for(const m of ['APPROVED','approved',' Approved ',null,undefined])assert.equal(resolve(row({moderation_status:m}),[],{quantity:1}).ok,true,String(m));
  assert.equal(resolve(null,[],{quantity:1}).ok,false,'a missing row is unavailable, not a crash');
});

// ---------- variants ----------
test('a product with variant rows requires an ACTIVE variant; parent stock is never a fallback',()=>{
  const p=row({stock:99});
  const vs=[variant(11,{colour:'Red',stock:3}),variant(12,{colour:'Blue',stock:0}),variant(13,{colour:'Old',stock:9,status:'inactive'})];
  let r=resolve(p,vs,{quantity:1});
  assert.equal(r.code,'VARIANT_REQUIRED');assert.match(r.message,/choose an option/i);
  r=resolve(p,vs,{variantId:'11',quantity:1});assert.equal(r.ok,true);assert.equal(r.variant.id,11);assert.equal(r.stock,3,'variant stock, not the parent 99');
  r=resolve(p,vs,{variantId:11,quantity:1});assert.equal(r.ok,true,'numeric variant ids work too');
  r=resolve(p,vs,{variantId:'12',quantity:1});assert.equal(r.code,'OUT_OF_STOCK');assert.equal(r.available,0);
  r=resolve(p,vs,{variantId:'13',quantity:1});assert.equal(r.code,'VARIANT_UNAVAILABLE','an inactive variant looks like a missing one');
  r=resolve(p,vs,{variantId:'999',quantity:1});assert.equal(r.code,'VARIANT_UNAVAILABLE');
  r=resolve(p,[variant(13,{status:'inactive'})],{variantId:'13',quantity:1});assert.equal(r.code,'UNAVAILABLE','all variants inactive => the product is unavailable');
  r=resolve(row({stock:50}),[variant(12,{stock:0})],{variantId:'12',quantity:1});assert.equal(r.code,'OUT_OF_STOCK','parent stock 50 must not make a sold-out variant buyable');
});
test('a product without variant rows cannot be bought with a variant id',()=>{
  const r=resolve(row(),[],{variantId:'5',quantity:1});
  assert.equal(r.code,'VARIANT_UNAVAILABLE');
  assert.equal(resolve(row(),[],{variantId:null,quantity:1}).ok,true);
  assert.equal(resolve(row(),[],{variantId:'',quantity:1}).ok,true);
});
test('stock boundaries: exactly stock is allowed, one more is not, and the message says how many are left',()=>{
  assert.equal(resolve(row({stock:5}),[],{quantity:5}).ok,true);
  const r=resolve(row({stock:5}),[],{quantity:6});
  assert.equal(r.code,'INSUFFICIENT_STOCK');assert.equal(r.available,5);assert.match(r.message,/only 5 left/i);
  assert.equal(resolve(row({stock:0}),[],{quantity:1}).code,'OUT_OF_STOCK');
  assert.equal(resolve(row({stock:-4}),[],{quantity:1}).code,'OUT_OF_STOCK','negative stock is treated as none');
  assert.equal(resolve(row({stock:'3'}),[],{quantity:3}).ok,true,'numeric strings from PostgreSQL are handled');
});

// ---------- price ----------
test('purchase price: variant price, inherited product price, and the vendor offer (single rule for cart, quote and order)',()=>{
  const p=row({price:1000});
  assert.equal(resolve(p,[],{quantity:1}).unitPrice,1000);
  assert.equal(resolve(p,[variant(1,{price:800})],{variantId:'1',quantity:1}).unitPrice,800);
  assert.equal(resolve(p,[variant(1,{price:0})],{variantId:'1',quantity:1}).unitPrice,1000,'a variant with no price inherits the product price - never free');
  assert.equal(resolve(p,[variant(1,{price:null})],{variantId:'1',quantity:1}).unitPrice,1000);
  const offer=row({price:1000,vendor_offer_enabled:true,vendor_offer_type:'percentage',vendor_offer_value:20});
  let r=resolve(offer,[],{quantity:1});
  assert.equal(r.unitPrice,800);assert.equal(r.listPrice,1000);assert.equal(r.offerApplied,true);
  const flat=row({price:1000,vendor_offer_enabled:true,vendor_offer_type:'flat',vendor_offer_value:150});
  assert.equal(resolve(flat,[],{quantity:1}).unitPrice,850);
  r=resolve(offer,[variant(1,{price:500})],{variantId:'1',quantity:1});assert.equal(r.unitPrice,400,'the offer applies to the variant price');
  const future=row({price:1000,vendor_offer_enabled:true,vendor_offer_type:'percentage',vendor_offer_value:20,vendor_offer_start:iso(86400000)});
  assert.equal(resolve(future,[],{quantity:1}).unitPrice,1000,'an offer that has not started yet is not applied');
  const ended=row({price:1000,vendor_offer_enabled:true,vendor_offer_type:'percentage',vendor_offer_value:20,vendor_offer_end:iso(-1000)});
  assert.equal(resolve(ended,[],{quantity:1}).unitPrice,1000,'an ended offer is not applied');
  const off=row({price:1000,vendor_offer_enabled:false,vendor_offer_type:'percentage',vendor_offer_value:20});
  assert.equal(resolve(off,[],{quantity:1}).unitPrice,1000,'a disabled offer is not applied');
  const over=row({price:100,vendor_offer_enabled:true,vendor_offer_type:'flat',vendor_offer_value:500});
  const r0=resolve(over,[],{quantity:1});
  assert.equal(r0.ok,false,'an offer that takes the price to zero never makes a FREE item purchasable');assert.equal(r0.code,'UNAVAILABLE');
  assert.equal(resolve(row({price:100,vendor_offer_enabled:true,vendor_offer_type:'percentage',vendor_offer_value:100}),[],{quantity:1}).ok,false,'a 100% offer is not purchasable either');
  assert.equal(resolve(row({price:0}),[],{quantity:1}).ok,false,'an unpriced product is not purchasable');
  assert.equal(resolve(row({price:null}),[],{quantity:1}).ok,false);
  assert.equal(resolve(row({price:500}),[variant(1,{price:0})],{variantId:'1',quantity:1}).unitPrice,500);
  // a Vibe-campaign line is priced on the LIST price (the campaign engine owns that discount) - no stacked vendor offer
  const camp=resolve(offer,[],{quantity:1,applyOffer:false});
  assert.equal(camp.unitPrice,1000);assert.equal(camp.offerApplied,false);
});

test('order/quote hardening: safe-integer ids, no stacked offer on campaign lines, stable product lock order',()=>{
  assert.match(purchaseSrc,/Number\.isSafeInteger\(productNumber\)\?productNumber:NaN/,'a huge id (1e21) never reaches a ::bigint cast');
  assert.match(purchaseSrc,/Number\.isSafeInteger\(variantNumber\)&&variantNumber>0/);
  assert.match(purchaseSrc,/\(raw\.vibe_attribution\|\|raw\.vibeAttribution\)\?\.vibeId/);
  assert.equal((purchaseSrc.match(/applyOffer:!campaign/g)||[]).length,2,'quote and order agree on the campaign rule');
  const lockAt=purchaseSrc.indexOf('ORDER BY id FOR UPDATE'),loopAt=purchaseSrc.indexOf('for(const raw of rawItems)');
  assert.ok(lockAt>0&&lockAt<loopAt,'products are locked in ascending id order BEFORE the per-line loop');
  assert.match(purchaseSrc,/\.sort\(\(a,b\)=>a-b\)/);
});
test('PARITY: what the catalogue shows is what the purchase resolver charges, for every product/variant combination',()=>{
  const products=[
    [row({price:500}),[]],
    [row({price:1000,vendor_offer_enabled:true,vendor_offer_type:'percentage',vendor_offer_value:10}),[]],
    [row({price:900,stock:0}),[variant(1,{price:800,stock:3}),variant(2,{price:0,stock:2,colour:'Blue'}),variant(3,{price:850,stock:0,colour:'Green'})]],
    [row({price:1000,vendor_offer_enabled:true,vendor_offer_type:'flat',vendor_offer_value:100}),[variant(1,{price:700,stock:4}),variant(2,{price:0,stock:4,colour:'Blue'})]],
  ];
  for(const [p,vs] of products){
    const model=lib.shopS1Model(p,vs);
    if(!vs.length){
      const r=resolve(p,vs,{quantity:1});
      assert.equal(r.unitPrice,model.options[0].finalPrice);continue;
    }
    for(const opt of model.options){
      const r=resolve(p,vs,{variantId:opt.id,quantity:1});
      if(opt.available){assert.equal(r.ok,true);assert.equal(r.unitPrice,opt.finalPrice,`variant ${opt.id}`);}
      else assert.equal(r.code,'OUT_OF_STOCK');
    }
  }
});

// ---------- cart-validate parser ----------
test('cart validate parser: strict shape, bounded, no client-supplied price/identity fields',()=>{
  const P=lib.parseShopCartValidate;
  const ok=P({items:[{productId:'12',quantity:2},{productId:12,variantId:'5'},{productId:'7',variantId:null}]});
  assert.equal(ok.error,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(ok.lines)),[{productId:'12',variantId:null,quantity:2},{productId:'12',variantId:'5',quantity:1},{productId:'7',variantId:null,quantity:1}]);
  const bad=[null,[],'x',{},{items:[]},{items:'x'},{items:[null]},{items:[[]]},{items:[{}]},
    {items:[{productId:'abc'}]},{items:[{productId:'1e3'}]},{items:[{productId:'-1'}]},{items:[{productId:'1 OR 1=1'}]},{items:[{productId:'1234567890123456789'}]},
    {items:[{productId:'1',variantId:'x'}]},{items:[{productId:'1',quantity:0}]},{items:[{productId:'1',quantity:100}]},{items:[{productId:'1',quantity:1.5}]},{items:[{productId:'1',quantity:'2x'}]},
    {items:[{productId:'1',price:1}]},{items:[{productId:'1',userId:2}]},{items:[{productId:'1',vendorId:2}]},{items:[{productId:'1'}],userId:2},{items:[{productId:'1'}],coupon:'X'},
    {items:Array.from({length:31},()=>({productId:'1'}))}];
  for(const b of bad)assert.ok(P(b).error,'should reject '+JSON.stringify(b).slice(0,60));
  assert.equal(P({items:Array.from({length:30},()=>({productId:'1'}))}).error,undefined,'30 lines is the limit');
});

// ---------- purchase path source pins ----------
test('quote and order item preparation are built on the shared resolver, not their own price/stock SQL',()=>{
  for(const fn of ['prepareMarketplaceOrderItems','prepareMarketplaceQuoteItemsV153D']){
    const body=between(`async function ${fn}(client,rawItems){`,fn==='prepareMarketplaceOrderItems'?'async function prepareMarketplaceQuoteItemsV153D':'async function getVendorDeliveryPreference');
    assert.match(body,/shopS2LoadPurchasable\(client,productId/);assert.match(body,/shopS2Resolve\(/);
    assert.doesNotMatch(body,/SELECT p\.\*,v\.vendor_code/,`${fn} must not carry its own product SELECT`);
    assert.doesNotMatch(body,/Number\(product\.price/,`${fn} must not price from the raw product row`);
    assert.doesNotMatch(body,/variant\.price\|\|product\.price/);
  }
  assert.match(purchaseSrc,/FOR UPDATE|lock:true/,'the order path still locks the product/variant rows');
  const order=between('async function prepareMarketplaceOrderItems(client,rawItems){','async function prepareMarketplaceQuoteItemsV153D');
  assert.match(order,/\{lock:true\}/);
  assert.match(order,/UPDATE vendor_product_variants SET stock=stock-\$1/);assert.match(order,/UPDATE vendor_products SET stock=stock-\$1/);
  const quote=between('async function prepareMarketplaceQuoteItemsV153D(client,rawItems){','async function getVendorDeliveryPreference');
  assert.doesNotMatch(quote,/UPDATE /,'pricing a quote never touches stock');
});
test('the purchasable loader uses to_regclass so a missing moderation table cannot abort an order transaction',()=>{
  const loader=between('    async function shopS2ModerationSql(db) {','    function shopS2Resolve(');
  assert.match(loader,/to_regclass\('howdi_shop_product_moderation_v162c'\)/);
  assert.match(loader,/SHOP_S1_MODERATION_SQL/);
  assert.match(loader,/\$1::bigint/);
  assert.match(loader,/FOR UPDATE OF p/);
});

// ---------- wishlist / cart source pins ----------
test('wishlist routes: session actor only, id-only storage, live catalogue cards, no client identity',()=>{
  assert.equal((s2Block.match(/requireCustomerSessionV152X\(req\)/g)||[]).length,2,'GET and PUT/DELETE both authenticate');
  assert.doesNotMatch(s2Block,/body\.(user_id|userId|customer_id|customerId)/,'the new wishlist API never reads an identity from the body');
  assert.doesNotMatch(s2Block,/searchParams\.get\(["'](user_id|userId)/);
  assert.match(s2Block,/INSERT INTO user_wishlist\(user_id,product_id,product_name,product_data,updated_at\) VALUES\(\$1,\$2,\$3,'\{\}'::jsonb,NOW\(\)\)/,'only the id and a server-derived name are stored');
  assert.match(s2Block,/\[userId, String\(row\.id\), shopS1Text\(row\.name, 255\)/);
  assert.match(s2Block,/DELETE FROM user_wishlist WHERE user_id=\$1 AND product_id=\$2/);
  assert.match(s2Block,/SHOP_S2_MAX_WISHLIST = 200/);
  assert.match(s2Block,/Unsupported query parameter/);
  assert.match(s2Block,/shopS1Card\(m\)/,'cards come from the same allow-listed serializer as the catalogue');
  const wishlistCode=s2Block.slice(s2Block.indexOf('// ---- wishlist (session-authoritative) ----'));
  for(const bad of ['vendor_profile_id','vendor_code','howdi_id','identity_uuid','master_id','vendorProfileId'])assert.ok(!wishlistCode.includes(bad),'no '+bad+' in the wishlist code');
});
test('legacy /api/wishlist routes: session-authoritative, blob ignored, other users refused',()=>{
  const start=source.indexOf('// Shop S2: the legacy wishlist routes keep their URLs');
  assert.notEqual(start,-1);
  const legacy=source.slice(start,source.indexOf('// ADDRESS BOOK - UPDATE',start));
  assert.equal((legacy.match(/requireCustomerSessionV152X\(req\)/g)||[]).length,3);
  assert.equal((legacy.match(/sendJSON\(res,403,/g)||[]).length,3,'GET path id, POST body id, DELETE query id');
  assert.doesNotMatch(legacy,/INSERT INTO user_wishlist|product_data|DELETE FROM user_wishlist WHERE user_id=\$1 AND product_id=\$2 RETURNING/,'legacy routes no longer write their own rows');
  assert.match(legacy,/shopS2WishlistAdd\(Number\(customer\.id\)/);
  assert.match(legacy,/shopS2WishlistRemove\(Number\(customer\.id\)/);
  assert.doesNotMatch(source,/user_wishlist WHERE user_id=\$1 ORDER BY created_at DESC`,\n\s*\[userId\]/,'the old client-id read is gone');
});
test('cart validate route is public, read-only and never echoes internal identity',()=>{
  const route=between('    if (req.method === "POST" && pathname === "/api/shop/cart/validate") {','    // ---- wishlist (session-authoritative) ----');
  assert.doesNotMatch(route,/requireCustomerSession|getSessionUserFromRequest/,'public: the cart is anonymous until checkout');
  assert.doesNotMatch(route,/INSERT|UPDATE|DELETE/i);
  assert.match(route,/loadShopS1Rows\(\{ ids \}\)/,'goes through the S1 visibility gate');
  const line=between('    function shopS2CartLine(line, loaded) {','    if (req.method === "POST" && pathname === "/api/shop/cart/validate") {');
  assert.match(line,/creator: \{ public_username: model\.creator\.public_username, display_name: model\.creator\.display_name \}/);
  assert.doesNotMatch(line,/vendor_profile_id|vendor_code|user_id|howdi_id|avatar/);
  assert.match(line,/status: "unavailable", message: "This product is no longer available" \}/,'hidden and unknown products are identical');
});
test('S2 adds no schema: it reuses user_wishlist / vendor_* / moderation tables',()=>{
  assert.doesNotMatch(s2Block,/CREATE TABLE|ALTER TABLE|CREATE INDEX/i);
  assert.doesNotMatch(purchaseSrc,/CREATE TABLE|ALTER TABLE/i);
});

// ---------- V16.2 legacy packs: guard ----------
function guardFor(){
  const admin={id:'11111111-1111-1111-1111-111111111111'};
  return vm.runInNewContext(guardSrc+'\n({shopV162GuardR2})',{getAdminSessionFromRequest:async(req)=>req.headers['x-howdi-admin-token']==='good'?admin:null,Promise});
}
const g=guardFor();
async function verdict(method,pathname,token){
  const req={method,headers:token?{'x-howdi-admin-token':token}:{}};
  const out=await g.shopV162GuardR2(req,pathname);
  return {out:out&&{status:out.status,body:JSON.parse(JSON.stringify(out.body))},req};
}
test('v162 guard: every registered /api/shop/v162* route is classified, and only the safe ones stay open',async()=>{
  const registered=[...source.matchAll(/^app\.(get|post|put|patch|delete)\("(\/api\/shop\/v162[a-d]\/[^"]*)"/gm)].map(m=>[m[1].toUpperCase(),m[2].replace(/:[A-Za-z]+/g,'123')]);
  assert.ok(registered.length>=35,'found the v162 routes: '+registered.length);
  const open=[],admin=[],denied=[],gone=[];
  for(const [m,p] of registered){
    const anon=(await verdict(m,p)).out;
    const adm=(await verdict(m,p,'good')).out;
    if(!anon)open.push(`${m} ${p}`);
    else if(anon.status===410)gone.push(`${m} ${p}`);
    else if(anon.status===401&&!adm)admin.push(`${m} ${p}`);
    else{assert.equal(anon.status,403,`${m} ${p}`);assert.equal(adm.status,403,`${m} ${p} must stay closed even for an admin token`);denied.push(`${m} ${p}`);}
  }
  assert.deepEqual(open.sort(),['GET /api/shop/v162a/capabilities','GET /api/shop/v162a/products/123/questions','GET /api/shop/v162b/capabilities','GET /api/shop/v162c/capabilities','GET /api/shop/v162d/capabilities','GET /api/shop/v162d/merchandising/123'].sort());
  assert.deepEqual(admin.sort(),['GET /api/shop/v162d/admin/queues','POST /api/shop/v162c/products/123/moderation'].sort());
  assert.deepEqual(gone.sort(),['GET /api/shop/v162a/discover','GET /api/shop/v162a/home'].sort());
  assert.equal(open.length+admin.length+gone.length+denied.length,registered.length);
  assert.equal(denied.length,26,'the unauthenticated write/identity routes are all closed');
  assert.equal(registered.length,36);
});
test('v162 guard: unregistered or oddly-cased paths under /api/shop/v162 are closed, other paths are not touched',async()=>{
  for(const p of ['/api/shop/v162c/inventory/adjust/','/api/shop/v162e/anything','/api/shop/v162/x','/api/shop/v162a/products/1/questions/../../view']){
    const v=await verdict('POST',p);assert.equal(v.out&&v.out.status,403,p);
  }
  for(const p of ['/api/shop/catalogue/products','/api/shop/wishlist','/api/shop/cart/validate','/api/works/anything','/api/connect/bootstrap','/api/wishlist'])
    assert.equal((await verdict('GET',p)).out,null,p+' is not the guard\'s business');
  assert.equal((await verdict('POST','/api/shop/v162a/products/1/questions')).out.status,403,'only GET is public for questions');
  assert.equal((await verdict('DELETE','/api/shop/v162a/capabilities')).out.status,403,'only GET is public for capabilities');
  const bad=await verdict('POST','/api/shop/v162c/products/1/moderation','forged');
  assert.equal(bad.out.status,401);assert.deepEqual(bad.out.body,{ok:false,error:'Admin sign-in required'});
  const ok=await verdict('POST','/api/shop/v162c/products/1/moderation','good');
  assert.equal(ok.out,null);assert.equal(ok.req.adminSession.id,'11111111-1111-1111-1111-111111111111','the admin session is attached for auditing');
});
test('v162 guard runs before the request body is read and before the route handler',()=>{
  const dispatcher=between('    async function howdiDispatchAppRouteR2(req,res){','    // =====================================================\n    // SERVER');
  assert.ok(dispatcher.indexOf('shopV162GuardR2(req,pathname)')>-1);
  assert.ok(dispatcher.indexOf('shopV162GuardR2(req,pathname)')<dispatcher.indexOf('getBody(req)'),'guard before body parse');
  assert.ok(dispatcher.indexOf('shopV162GuardR2(req,pathname)')<dispatcher.indexOf('route.handler(req,res)'),'guard before handler');
});
test('moderation handler: admin-derived seller, validated status, audited, no error leakage',()=>{
  const h=between('app.post("/api/shop/v162c/products/:productId/moderation"','app.get("/api/shop/v162c/seller/notifications"');
  assert.match(h,/\["PENDING","APPROVED","REJECTED","SUSPENDED"\]/);
  assert.match(h,/JOIN vendor_profiles v ON v\.id=p\.vendor_profile_id JOIN users u ON u\.id=v\.user_id/,'seller comes from the product, not the request');
  assert.doesNotMatch(h,/b\.sellerUserId|req\.user/);
  assert.match(h,/auditAdminSecurity\(req,req\.adminSession,"SHOP_PRODUCT_MODERATION"/);
  assert.doesNotMatch(h,/error:e\.message/);
  for(const name of ['app.get("/api/shop/v162d/admin/queues"','app.get("/api/shop/v162d/merchandising/:placement"','app.get("/api/shop/v162a/products/:productId/questions"']){
    const s=source.indexOf(name);const seg=source.slice(s,source.indexOf('\n});',s));
    assert.doesNotMatch(seg,/error:e\.message/,name+' must not echo database errors');
  }
});

// ---------- front end ----------
test('UI actions: only the session wishlist and cart-validate endpoints; no identity, no localhost, no storage',()=>{
  const code=actionsJsx.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  const apis=code.match(/\/api\/[A-Za-z0-9/_${}.-]+/g)||[];
  assert.ok(apis.length>=4,'wishlist GET/PUT/DELETE + cart validate');
  for(const a of apis)assert.match(a,/^\/api\/shop\/(wishlist|cart\/validate)/,'unexpected endpoint '+a);
  assert.doesNotMatch(code,/user_?[iI]d|customer_?[iI]d|howdi_?id|localhost|localStorage|sessionStorage|Math\.random/);
  assert.match(code,/headers: headersRef\.current \? headersRef\.current\(\) : \{\}/,'the session token is attached to every wishlist call');
  assert.doesNotMatch(code,/\/api\/(orders|cart|checkout|payments?)\b/,'this module never places orders');
  assert.match(code,/PENDING_TTL_MS = 10 \* 60 \* 1000/,'remembered sign-in intent expires');
  assert.match(code,/Date\.now\(\) - pending\.at < PENDING_TTL_MS/);
});
test('UI actions: login continuation, optimistic-free state, accessible controls',()=>{
  assert.match(actionsJsx,/pendingRef\.current = \{ type: "wishlist", productId: id, at: Date\.now\(\) \}/);
  assert.match(actionsJsx,/if \(loginRef\.current\) loginRef\.current\(\)/,'the app login is opened for visitors');
  assert.match(actionsJsx,/await refresh\(\);[\s\S]{0,400}pending\.type === "wishlist"[\s\S]{0,300}await save\(pending\.productId\)/,'the saved intent is completed after sign-in');
  assert.match(actionsJsx,/error\.httpStatus === 401/,'an expired session re-opens login instead of failing silently');
  for(const b of actionsJsx.match(/<button\b[^>]*>/g)||[])assert.match(b,/type="button"/,'button without type: '+b.slice(0,60));
  assert.match(actionsJsx,/aria-pressed=\{saved\}/);assert.match(actionsJsx,/aria-label=\{saved \? `Remove \$\{name\} from wishlist` : `Save \$\{name\} to wishlist`\}/);
  assert.match(actionsJsx,/role=\{kind === "error" \? "alert" : "status"\}/);
  assert.match(actionsJsx,/aria-label="Decrease quantity"/);assert.match(actionsJsx,/aria-label="Increase quantity"/);
  assert.match(actionsJsx,/disabled=\{disabled\}/);assert.match(actionsJsx,/Choose an option to continue/);assert.match(actionsJsx,/Currently out of stock/);
  assert.match(actionsCss,/\.sc-heart\{width:44px;height:44px/,'44px touch targets');
  for(const group of actionsCss.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/(^|\})\s*([^{}@]+)\{/g))for(const s of group[2].split(','))assert.match(s.trim(),/^\.sc-|^\.sc-/,'unscoped selector '+s.trim());
});
test('UI actions: a cart line is validated by the server before it is added, and its price/options come from the server',()=>{
  assert.match(actionsJsx,/const checked = await validateLine\(base, \{ productId: String\(productId\)/);
  assert.match(actionsJsx,/unitPrice: checked\.unitPrice, listPrice: checked\.listPrice/);
  assert.match(actionsJsx,/if \(checked\.status !== "ok"\)/);
  assert.match(actionsJsx,/onAddToCart\(line\)/);assert.match(actionsJsx,/onBuyNow\(line\)/);
});
test('Catalogue wiring: hearts on cards, actions on the product page, wishlist view, and props from the app',()=>{
  assert.match(catalogue,/import \{ ShopActionsContext, useShopWishlistActions, WishlistHeart, ActionNotice, ProductActions, WishlistPanel \} from "\.\/ShopProductActions";/);
  assert.match(catalogue,/<WishlistHeart productId=\{product\.id\} name=\{product\.name\} \/>/);
  assert.match(catalogue,/<ProductActions product=\{product\} selectedVariant=\{selectedVariant\} needsChoice=\{needsChoice\} availability=\{shownAvailability\} \/>/);
  assert.equal((catalogue.match(/<ShopActionsContext\.Provider value=\{actions\}>/g)||[]).length,3,'browse, detail and wishlist views share one actions instance');
  assert.match(catalogue,/data-shop-catalogue="wishlist"/);
  assert.match(app,/<ShopCatalogue apiBase=\{SHOP_API_BASE\} onExit=\{\(\)=>openNavigationOSArea\("shop","home"\)\}\s+signedIn=\{Boolean\(currentUser\?\.id\)\} getAuthHeaders=\{customerSessionHeaders\} onRequireLogin=\{openLogin\}\s+onAddToCart=\{addCatalogueLineToCart\} onBuyNow=\{buyCatalogueLine\}/);
  assert.match(app,/openProductId=\{shopCatalogueProductId\} onOpenProductHandled=\{\(\)=>setShopCatalogueProductId\(""\)\}/);
});
test('App wishlist: the localhost/user-id calls are gone; everything goes through the session API',()=>{
  assert.doesNotMatch(app,/localhost:5000\/api\/wishlist/,'the wishlist no longer calls a hard-coded localhost URL');
  assert.doesNotMatch(app,/\/api\/wishlist\/user\//);
  assert.doesNotMatch(app,/user_id: currentUser\.id,\s*product,/,'no client-supplied user id / product blob');
  assert.match(app,/`\$\{SHOP_API_BASE\}\/api\/shop\/wishlist`, \{ cache: "no-store", headers: customerSessionHeaders\(\) \}/);
  assert.match(app,/`\$\{SHOP_API_BASE\}\/api\/shop\/wishlist\/\$\{encodeURIComponent\(productId\)\}`/);
  assert.match(app,/method: exists \? "DELETE" : "PUT"/);
  assert.match(app,/if \(response\.status === 401\) openLogin\(\);/);
  assert.match(app,/!\/\^\\d\{1,18\}\$\/\.test\(productId\)/,'only real catalogue ids are sent');
  assert.match(app,/localStorage\.removeItem\(`howdiWishlist_\$\{currentUser\.id\}`\)/,'the old cached copy of the list is cleared');
  assert.doesNotMatch(app,/localStorage\.setItem\(`howdiWishlist_/);
  assert.match(app,/if \(product\?\.catalogueProduct\) \{ openCatalogueProduct\(product\.id\); return; \}/,'saved products open their real product page');
});
test('App cart: Remove works for keyed lines, lines are re-checked against the server, and the cart list has unique keys',()=>{
  assert.match(app,/current\.filter\(\(item\) => \(item\.cartKey \|\| item\.name\) !== cartKeyOrName\)/,'Remove matches the same key the button sends (it used to compare name to cartKey and never removed anything)');
  assert.doesNotMatch(app,/current\.filter\(\(item\) => item\.name !== productName\)/);
  assert.match(app,/<article key=\{item\.cartKey\|\|item\.name\} className="howdi-cart-item">/);
  assert.match(app,/`\$\{SHOP_API_BASE\}\/api\/shop\/cart\/validate`/);
  assert.match(app,/if \(!cartOpen \|\| !cart\.length\) return undefined;/);
  assert.match(app,/const fromVibe = Boolean\(item\.vibeAttribution \|\| item\.vibe_attribution\);/,'campaign-priced Vibe lines are not overwritten by list prices');
  assert.match(app,/result\.status === "insufficient_stock" && result\.available > 0/);
  assert.match(app,/setCart\(\(current\) => \{\s*let changed = false;/,'no state churn when nothing changed');
  assert.match(app,/const catalogueLineToCartItem = \(line\) => \(\{/);
  assert.match(app,/selectedVariantId: line\.variantId \|\| null,/,'the chosen variant id travels into checkout');
  // Connect / Works / Learn entry points untouched
  assert.match(app,/openNavigationOSArea\("works","find"\)/);assert.match(app,/openNavigationOSArea\("learn","discover"\)/);
});

test('regression: "Picked for you" and cart "Complete your cart" tolerate plain products (they used to throw and blank the app)',()=>{
  // getPersonalizedProducts/getCartRecommendations return plain products; both UI lists destructure { product, reasons }.
  const cartStart=app.indexOf('const cartRecommendations = getCartRecommendations(');
  assert.ok(cartStart>0);
  const cartSrc=app.slice(cartStart,app.indexOf('.slice(0, 4);',cartStart)+'.slice(0, 4);'.length);
  const tasteStart=app.indexOf('const visible = personalized');
  assert.ok(tasteStart>0);
  const tasteSrc=app.slice(tasteStart,app.indexOf('.slice(0, 6);',tasteStart)+'.slice(0, 6);'.length);
  const plain=[{name:'A'},{name:'B'},{name:'C'},undefined,null];
  const cart=[{name:'B'}];
  const run=(src,stubs)=>new Function(...Object.keys(stubs),src.replace(/^const (\w+) =/,'const $1 =')+'\nreturn '+src.match(/^const (\w+)/)[1]+';')(...Object.values(stubs));
  const cartOut=run(cartSrc,{getCartRecommendations:()=>plain,cart,products:[],currentUser:null,customerLocation:'',wishlist:[],recentlyViewed:[]});
  assert.deepEqual(cartOut.map((e)=>e.product.name),['A','B','C'],'plain products are wrapped, missing entries dropped');
  assert.ok(cartOut.every((e)=>Array.isArray(e.reasons)));
  const tasteOut=run(tasteSrc,{personalized:plain,cart});
  assert.deepEqual(tasteOut.map((e)=>e.product.name),['A','C'],'items already in the cart are excluded, missing entries dropped');
  // the already-wrapped shape still works
  assert.deepEqual(run(tasteSrc,{personalized:[{product:{name:'Z'},reasons:['x']}],cart}),[{product:{name:'Z'},reasons:['x']}]);
});

test('App: catalogue "Buy now" keeps the existing cart (legacy buyNow replaced it)',()=>{
  const at=app.indexOf('const buyCatalogueLine = (line) => {');
  assert.ok(at>0);
  const body=app.slice(at,app.indexOf('};',at));
  assert.match(body,/addToCart\(catalogueLineToCartItem\(line\), line\.quantity\);/);
  assert.match(body,/setCartOpen\(true\);/);
  assert.doesNotMatch(body,/buyNow\(/);assert.doesNotMatch(body,/setCart\(/);
});
