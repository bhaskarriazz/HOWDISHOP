// Shop S2 — Product Actions & Purchase-Path Integrity, against a real server + real PostgreSQL.
const L=require('./lib.cjs');
const {api,pool,check}=L;
const LEAK=/user_id|userId|howdi_id|master_id|identity_uuid|vendor_profile_id|vendorProfileId|vendor_code|vendorCode|owner_user|password/i;
const money=(n)=>Math.round(n*100)/100;

(async()=>{
  // ---------- fixtures ----------
  const asha=await L.mkUser('Asha Owner','asha_crochet');
  const sus=await L.mkUser('Sus Owner','sus_studio');
  const alice=await L.mkUser('Alice','alice_buyer');
  const bob=await L.mkUser('Bob','bob_buyer');
  const carol=await L.mkUser('Carol','carol_buyer');
  const admin=await L.mkAdmin();
  const vid=await L.mkVendor(asha,'Asha Crochet Studio');
  const svid=await L.mkVendor(sus,'Suspended Studio','suspended');

  const P={};
  P.simple=await L.mkProduct(vid,'Simple Tote',{price:500,stock:5});
  P.variant=await L.mkProduct(vid,'Variant Blanket',{price:900,stock:0});
  const vRed=await L.mkVariant(vid,P.variant,{colour:'Red',size:'S',price:800,stock:3});
  const vBlue=await L.mkVariant(vid,P.variant,{colour:'Blue',size:'M',price:0,stock:2});      // inherits product price 900
  const vGreen=await L.mkVariant(vid,P.variant,{colour:'Green',size:'L',price:850,stock:0});   // sold out
  const vOld=await L.mkVariant(vid,P.variant,{colour:'Old',size:'XL',price:100,stock:9,status:'inactive'});
  P.offer=await L.mkProduct(vid,'Offer Bag',{price:1000,stock:4,offer:{type:'percentage',value:20}});
  P.draft=await L.mkProduct(vid,'Draft Bag',{status:'draft'});
  P.archived=await L.mkProduct(vid,'Archived Bag',{archived_at:new Date()});
  P.scheduled=await L.mkProduct(vid,'Scheduled Bag',{published_at:new Date(Date.now()+86400000*30)});
  P.moderated=await L.mkProduct(vid,'Moderated Bag');
  P.suspended=await L.mkProduct(svid,'Suspended Vendor Bag');
  await pool.query(`INSERT INTO howdi_shop_product_moderation_v162c(product_id,seller_user_id,status,reason) VALUES($1,$2,'REJECTED','test')`,[P.moderated,asha.identity_uuid]);
  const hidden=[P.draft,P.archived,P.scheduled,P.moderated,P.suspended];
  const UNKNOWN='999999';

  // ---------- catalogue baseline: what shoppers can see ----------
  const list=await api('GET','/api/shop/catalogue/products?limit=48');
  const listedIds=(list.json.products||[]).map(p=>p.id).sort();
  check('catalogue lists exactly the visible products',JSON.stringify(listedIds)===JSON.stringify([P.simple,P.variant,P.offer].sort()),listedIds);
  const offerCard=(list.json.products||[]).find(p=>p.id===P.offer);
  check('catalogue shows the vendor-offer price (800)',offerCard&&offerCard.price.current===800,offerCard&&offerCard.price);
  const detail=await api('GET',`/api/shop/catalogue/products/${P.variant}`);
  const blueOpt=(detail.json.product.variants||[]).find(v=>v.id===vBlue);
  check('variant without own price inherits product price in the catalogue (never ₹0)',blueOpt&&blueOpt.price.current===900,blueOpt&&blueOpt.price);

  // ---------- cart validation (public) ----------
  const cv=(items,extra={})=>api('POST','/api/shop/cart/validate',{body:{items,...extra}});
  let r=await cv([{productId:P.simple,quantity:2}]);
  check('cart validate: simple product ok, no login needed',r.status===200&&r.json.lines[0].status==='ok'&&r.json.lines[0].unitPrice===500&&r.json.lines[0].lineTotal===1000,r.text);
  check('cart validate: summary totals',r.json.summary.subtotal===1000&&r.json.summary.itemCount===2&&r.json.summary.allOk===true,r.json.summary);
  check('cart validate: response leaks no internal ids',!LEAK.test(r.text),r.text.slice(0,300));
  r=await cv([{productId:P.simple,quantity:6}]);
  check('cart validate: more than stock -> insufficient_stock with available',r.json.lines[0].status==='insufficient_stock'&&r.json.lines[0].available===5,r.json.lines[0]);
  r=await cv([{productId:P.variant,quantity:1}]);
  check('cart validate: variant product without a variant -> variant_required (parent stock is never used)',r.json.lines[0].status==='variant_required',r.json.lines[0]);
  r=await cv([{productId:P.variant,variantId:vRed,quantity:1}]);
  check('cart validate: red variant ok at its own price',r.json.lines[0].status==='ok'&&r.json.lines[0].unitPrice===800&&r.json.lines[0].variantLabel==='Red / S',r.json.lines[0]);
  r=await cv([{productId:P.variant,variantId:vBlue,quantity:2}]);
  check('cart validate: variant with price 0 is charged the product price',r.json.lines[0].status==='ok'&&r.json.lines[0].unitPrice===900&&r.json.lines[0].lineTotal===1800,r.json.lines[0]);
  r=await cv([{productId:P.variant,variantId:vGreen,quantity:1}]);
  check('cart validate: sold-out variant -> out_of_stock',r.json.lines[0].status==='out_of_stock',r.json.lines[0]);
  r=await cv([{productId:P.variant,variantId:vOld,quantity:1}]);
  check('cart validate: inactive variant is indistinguishable from a missing one',r.json.lines[0].status==='variant_unavailable',r.json.lines[0]);
  r=await cv([{productId:P.simple,variantId:vRed,quantity:1}]);
  check('cart validate: a variant of a different product is refused',r.json.lines[0].status==='variant_unavailable',r.json.lines[0]);
  r=await cv([{productId:P.offer,quantity:1}]);
  check('cart validate: vendor offer is the purchase price',r.json.lines[0].unitPrice===800&&r.json.lines[0].listPrice===1000&&r.json.lines[0].onOffer===true,r.json.lines[0]);
  const unknownMsg=(await cv([{productId:UNKNOWN,quantity:1}])).json.lines[0];
  for(const [label,id] of Object.entries({draft:P.draft,archived:P.archived,scheduled:P.scheduled,moderated:P.moderated,suspendedVendor:P.suspended})){
    r=await cv([{productId:id,quantity:1}]);
    const line=r.json.lines[0];
    check(`cart validate: ${label} product is unavailable and looks exactly like an unknown id`,line.status==='unavailable'&&line.message===unknownMsg.message&&!line.name&&!line.unitPrice&&!('creator' in line),line);
  }
  r=await cv([{productId:P.simple,quantity:1},{productId:P.draft,quantity:1}]);
  check('cart validate: mixed cart reports per line and allOk=false',r.json.lines[0].status==='ok'&&r.json.lines[1].status==='unavailable'&&r.json.summary.allOk===false&&r.json.summary.subtotal===500,r.json.summary);
  const bad=[
    ['not an object',[]],['unknown top-level field',{items:[{productId:P.simple}],userId:1}],['no items',{items:[]}],
    ['too many lines',{items:Array.from({length:31},()=>({productId:P.simple,quantity:1}))}],
    ['bad product id',{items:[{productId:'1e3'}]}],['sql-ish product id',{items:[{productId:"1;DROP TABLE users"}]}],
    ['bad variant id',{items:[{productId:P.simple,variantId:'x'}]}],['quantity 0',{items:[{productId:P.simple,quantity:0}]}],
    ['quantity 100',{items:[{productId:P.simple,quantity:100}]}],['fractional quantity',{items:[{productId:P.simple,quantity:1.5}]}],
    ['client-supplied price',{items:[{productId:P.simple,quantity:1,price:1}]}],['client-supplied vendor',{items:[{productId:P.simple,quantity:1,vendorId:1}]}],
  ];
  for(const [label,body] of bad){
    const x=await api('POST','/api/shop/cart/validate',{body:Array.isArray(body)?JSON.stringify(body):body});
    check(`cart validate rejects: ${label}`,x.status===400&&x.json&&x.json.status==='error',{status:x.status,text:x.text.slice(0,120)});
  }
  r=await api('POST','/api/shop/cart/validate',{body:'{not json'});
  check('cart validate: malformed JSON is a clean 400',r.status===400,r.status);

  // ---------- wishlist (session-authoritative) ----------
  r=await api('GET','/api/shop/wishlist');
  check('wishlist GET needs a session',r.status===401,r.status);
  r=await api('PUT',`/api/shop/wishlist/${P.simple}`);
  check('wishlist PUT needs a session',r.status===401,r.status);
  r=await api('DELETE',`/api/shop/wishlist/${P.simple}`);
  check('wishlist DELETE needs a session',r.status===401,r.status);
  r=await api('PUT',`/api/shop/wishlist/${P.simple}`,{token:alice.token,body:{userId:bob.id,user_id:bob.id,customerId:bob.id,product:{name:'HACKED',price:1,id:'x'}}});
  check('wishlist PUT saves for the SESSION user even if the client names someone else',r.status===200&&r.json.saved===true&&r.json.productId===P.simple,r.text.slice(0,200));
  check('wishlist PUT response is a catalogue card without internal ids',r.json.item&&r.json.item.name==='Simple Tote'&&!LEAK.test(JSON.stringify(r.json)),r.text.slice(0,300));
  let rows=(await pool.query(`SELECT user_id,product_id,product_name,product_data FROM user_wishlist WHERE product_id=$1`,[P.simple])).rows;
  check('wishlist stored exactly one row for alice, with server-derived name and no client blob',rows.length===1&&Number(rows[0].user_id)===alice.id&&rows[0].product_name==='Simple Tote'&&JSON.stringify(rows[0].product_data)==='{}',rows);
  await api('PUT',`/api/shop/wishlist/${P.simple}`,{token:alice.token});
  rows=(await pool.query(`SELECT 1 FROM user_wishlist WHERE user_id=$1`,[alice.id])).rows;
  check('wishlist PUT is idempotent',rows.length===1,rows.length);
  r=await api('GET','/api/shop/wishlist',{token:alice.token});
  check('wishlist GET returns alice\'s live card + ids',r.status===200&&r.json.count===1&&r.json.ids[0]===P.simple&&r.json.items[0].price.current===500&&r.json.unavailableCount===0&&!LEAK.test(r.text),r.text.slice(0,300));
  r=await api('GET','/api/shop/wishlist?userId='+bob.id,{token:alice.token});
  check('wishlist GET refuses query parameters (no identity via query)',r.status===400,r.status);
  r=await api('GET','/api/shop/wishlist',{token:bob.token});
  check('bob cannot see alice\'s wishlist',r.status===200&&r.json.count===0,r.text.slice(0,200));
  r=await api('DELETE',`/api/shop/wishlist/${P.simple}?userId=${alice.id}`,{token:bob.token});
  rows=(await pool.query(`SELECT 1 FROM user_wishlist WHERE user_id=$1`,[alice.id])).rows;
  check('bob deleting the same product id does not touch alice\'s row',r.status===200&&r.json.removed===false&&rows.length===1,{status:r.status,rows:rows.length});
  const notFound=(await api('PUT',`/api/shop/wishlist/${UNKNOWN}`,{token:alice.token}));
  check('wishlist PUT unknown product -> 404',notFound.status===404,notFound.text);
  for(const [label,id] of Object.entries({draft:P.draft,archived:P.archived,scheduled:P.scheduled,moderated:P.moderated,suspendedVendor:P.suspended})){
    r=await api('PUT',`/api/shop/wishlist/${id}`,{token:alice.token});
    check(`wishlist PUT ${label} product -> same 404 as unknown`,r.status===404&&r.text===notFound.text,{status:r.status,text:r.text});
  }
  for(const bad of ['abc','1e3','12345678901234567890','-1']){
    r=await api('PUT',`/api/shop/wishlist/${encodeURIComponent(bad)}`,{token:alice.token});
    check(`wishlist PUT invalid id ${bad} -> 400`,r.status===400,r.status);
  }
  // an item that becomes hidden after being saved is counted but never listed
  await api('PUT',`/api/shop/wishlist/${P.offer}`,{token:alice.token});
  await pool.query(`UPDATE vendor_products SET status='draft' WHERE id=$1`,[P.offer]);
  r=await api('GET','/api/shop/wishlist',{token:alice.token});
  check('wishlist hides items that are no longer visible and reports the count',r.json.count===1&&r.json.ids.join()===P.simple&&r.json.unavailableCount===1&&!r.text.includes('Offer Bag'),r.text.slice(0,300));
  await pool.query(`UPDATE vendor_products SET status='published' WHERE id=$1`,[P.offer]);
  r=await api('GET','/api/shop/wishlist',{token:alice.token});
  check('wishlist shows the item again when it is visible again',r.json.count===2,r.json.count);
  r=await api('DELETE',`/api/shop/wishlist/${P.offer}`,{token:alice.token});
  check('wishlist DELETE own item',r.status===200&&r.json.removed===true&&r.json.saved===false,r.text);
  r=await api('DELETE',`/api/shop/wishlist/${P.offer}`,{token:alice.token});
  check('wishlist DELETE twice is harmless',r.status===200&&r.json.removed===false,r.text);
  // cap
  await pool.query(`INSERT INTO user_wishlist(user_id,product_id,product_name) SELECT $1,'legacy-'||g,'Legacy '||g FROM generate_series(1,200) g`,[carol.id]);
  r=await api('GET','/api/shop/wishlist',{token:carol.token});
  check('legacy non-catalogue wishlist rows are counted but never listed',r.json.count===0&&r.json.unavailableCount===200,r.text.slice(0,200));
  r=await api('PUT',`/api/shop/wishlist/${P.simple}`,{token:carol.token});
  check('wishlist is capped at 200 items',r.status===409,r.text);
  r=await api('PUT',`/api/shop/wishlist/${P.simple}`,{token:'not-a-session'});
  check('wishlist rejects an invalid session token',r.status===401,r.status);

  // ---------- legacy /api/wishlist routes are session-authoritative ----------
  r=await api('GET',`/api/wishlist/user/${alice.id}`);
  check('legacy wishlist GET without a session -> 401 (was: anyone could read any user)',r.status===401,r.status);
  r=await api('GET',`/api/wishlist/user/${alice.id}`,{token:bob.token});
  check('legacy wishlist GET of another user -> 403',r.status===403,r.status);
  r=await api('GET',`/api/wishlist/user/${alice.id}`,{token:alice.token});
  check('legacy wishlist GET own list -> live catalogue items',r.status===200&&r.json.wishlist.length===1&&r.json.wishlist[0].product_id===P.simple&&!/"user_id"|howdi_id/.test(r.text),r.text.slice(0,300));
  r=await api('POST','/api/wishlist',{body:{user_id:alice.id,product:{id:P.variant,name:'x'}}});
  check('legacy wishlist POST without a session -> 401',r.status===401,r.status);
  r=await api('POST','/api/wishlist',{token:bob.token,body:{user_id:alice.id,product:{id:P.variant,name:'x'}}});
  check('legacy wishlist POST naming another user -> 403',r.status===403,r.status);
  rows=(await pool.query(`SELECT 1 FROM user_wishlist WHERE product_id=$1`,[P.variant])).rows;
  check('...and nothing was written',rows.length===0,rows.length);
  r=await api('POST','/api/wishlist',{token:bob.token,body:{product:{id:P.variant,name:'HACKED NAME',price:1,product_data:{evil:true}}}});
  rows=(await pool.query(`SELECT product_name,product_data FROM user_wishlist WHERE user_id=$1 AND product_id=$2`,[bob.id,P.variant])).rows;
  check('legacy wishlist POST ignores the client product blob',r.status===201&&rows.length===1&&rows[0].product_name==='Variant Blanket'&&JSON.stringify(rows[0].product_data)==='{}',{status:r.status,rows});
  r=await api('POST','/api/wishlist',{token:bob.token,body:{product:{id:'Some Demo Product Name',name:'Some Demo Product Name'}}});
  check('legacy wishlist POST with a non-catalogue id is refused',r.status===400,r.text);
  r=await api('DELETE',`/api/wishlist/${P.variant}?user_id=${alice.id}`,{token:bob.token});
  check('legacy wishlist DELETE naming another user -> 403',r.status===403,r.status);
  r=await api('DELETE',`/api/wishlist/${P.variant}`);
  check('legacy wishlist DELETE without a session -> 401',r.status===401,r.status);
  r=await api('DELETE',`/api/wishlist/${P.variant}`,{token:bob.token});
  check('legacy wishlist DELETE own item',r.status===200,r.text);

  // ---------- V16.2 legacy Shop packs: deny by default ----------
  const invBefore=Number((await pool.query(`SELECT COUNT(*)::int n FROM howdi_shop_inventory_ledger`)).rows[0].n);
  const retired=[
    ['POST','/api/shop/v162c/inventory/adjust',{sellerUserId:asha.identity_uuid,productId:P.simple,changeQty:999}],
    ['GET',`/api/shop/v162c/seller/dashboard?sellerUserId=${asha.identity_uuid}`],
    ['GET',`/api/shop/v162c/seller/settlements?sellerUserId=${asha.identity_uuid}`],
    ['GET',`/api/shop/v162c/seller/notifications?sellerUserId=${asha.identity_uuid}`],
    ['PUT',`/api/shop/v162c/products/${P.simple}/campaign-consent`,{sellerUserId:asha.identity_uuid,vendorFundedConsent:'ALLOWED'}],
    ['POST','/api/shop/v162a/products/1/view',{userId:alice.identity_uuid}],
    ['GET',`/api/shop/v162a/recently-viewed?userId=${alice.identity_uuid}`],
    ['POST','/api/shop/v162a/products/1/questions',{userId:alice.identity_uuid,question:'spam'}],
    ['POST','/api/shop/v162a/save-for-later/1',{userId:alice.identity_uuid}],
    ['DELETE',`/api/shop/v162a/save-for-later/1?userId=${alice.identity_uuid}`],
    ['POST','/api/shop/v162b/checkout/session',{userId:alice.identity_uuid,subtotal:1}],
    ['PATCH','/api/shop/v162b/checkout/1',{couponCode:'X'}],
    ['POST','/api/shop/v162b/checkout/1/payment-intent',{userId:alice.identity_uuid,amount:1}],
    ['GET','/api/shop/v162b/orders/1/timeline'],
    ['POST','/api/shop/v162b/orders/1/request',{type:'REFUND',userId:alice.identity_uuid}],
    ['POST','/api/shop/v162b/orders/1/support',{userId:alice.identity_uuid}],
    ['POST','/api/shop/v162b/orders/1/shipment',{courierName:'x'}],
    ['PATCH','/api/shop/v162b/orders/1/status',{status:'DELIVERED'}],
    ['POST','/api/shop/v162d/collections',{userId:alice.identity_uuid,name:'x'}],
    ['GET',`/api/shop/v162d/rewards?userId=${alice.identity_uuid}`],
    ['PUT','/api/shop/v162d/products/1/alert',{userId:alice.identity_uuid}],
    ['POST','/api/shop/v162d/orders/1/dispute',{userId:alice.identity_uuid}],
  ];
  for(const [m,p,b] of retired){
    r=await api(m,p,{body:b});
    check(`retired v162 route ${m} ${p.split('?')[0]} -> 403`,r.status===403&&r.json&&r.json.ok===false&&!/relation|column|uuid|syntax/i.test(r.text),{status:r.status,text:r.text.slice(0,150)});
    r=await api(m,p,{body:b,token:alice.token});
    check(`retired v162 route stays 403 for a signed-in customer: ${m} ${p.split('?')[0]}`,r.status===403,r.status);
  }
  const invAfter=Number((await pool.query(`SELECT COUNT(*)::int n FROM howdi_shop_inventory_ledger`)).rows[0].n);
  check('no unauthenticated write reached the v162 tables',invBefore===invAfter,{invBefore,invAfter});
  for(const p of ['/api/shop/v162a/discover?q=a','/api/shop/v162a/home']){
    r=await api('GET',p); check(`superseded ${p} -> 410`,r.status===410&&!/relation|howdi_products/i.test(r.text),{status:r.status,text:r.text.slice(0,150)});
  }
  for(const p of ['/api/shop/v162a/capabilities','/api/shop/v162b/capabilities','/api/shop/v162c/capabilities','/api/shop/v162d/capabilities','/api/shop/v162d/merchandising/home','/api/shop/v162a/products/1/questions']){
    r=await api('GET',p); check(`public read stays open: ${p}`,r.status===200&&r.json.ok===true,{status:r.status,text:r.text.slice(0,150)});
  }
  r=await api('GET','/api/shop/v162d/admin/queues');
  check('admin queues need an admin token',r.status===401,r.status);
  r=await api('GET','/api/shop/v162d/admin/queues',{token:alice.token});
  check('a customer session is not an admin token',r.status===401,r.status);
  r=await api('GET','/api/shop/v162d/admin/queues',{admin});
  check('admin queues open with a valid admin token',r.status===200&&r.json.ok===true,r.text.slice(0,150));
  r=await api('GET','/api/shop/v162d/admin/queues',{admin:'howdi-admin-forged'});
  check('a forged admin token is refused',r.status===401,r.status);

  // ---------- moderation is admin-only and is what the catalogue gate reads ----------
  const mod=(pid,body,opts={})=>api('POST',`/api/shop/v162c/products/${pid}/moderation`,{body,...opts});
  r=await mod(P.simple,{status:'REJECTED'});
  check('anonymous moderation write -> 401',r.status===401,r.status);
  r=await mod(P.simple,{status:'REJECTED',sellerUserId:asha.identity_uuid},{token:alice.token});
  check('customer moderation write -> 401',r.status===401,r.status);
  r=await api('GET',`/api/shop/catalogue/products/${P.simple}`);
  check('product still visible after the refused moderation attempts',r.status===200,r.status);
  r=await mod(P.simple,{status:'HIDDEN'},{admin});
  check('moderation rejects unknown statuses',r.status===400,r.text);
  r=await mod('abc',{status:'REJECTED'},{admin});
  check('moderation rejects a non-numeric product id',r.status===400,r.text);
  r=await mod(UNKNOWN,{status:'REJECTED'},{admin});
  check('moderation of an unknown product -> 404',r.status===404,r.text);
  r=await mod(P.simple,{status:'rejected',reason:'policy test'},{admin});
  check('admin moderation write works (seller derived from the product)',r.status===200&&r.json.moderation.status==='REJECTED',r.text.slice(0,200));
  const modRow=(await pool.query(`SELECT seller_user_id,reviewed_by FROM howdi_shop_product_moderation_v162c WHERE product_id=$1 ORDER BY id DESC LIMIT 1`,[P.simple])).rows[0];
  check('moderation row records the real seller and the reviewing admin session',modRow.seller_user_id===asha.identity_uuid&&modRow.reviewed_by,modRow);
  r=await api('GET',`/api/shop/catalogue/products/${P.simple}`);
  check('a REJECTED product disappears from the catalogue',r.status===404,r.status);
  r=await cv([{productId:P.simple,quantity:1}]);
  check('...and from cart validation',r.json.lines[0].status==='unavailable',r.json.lines[0]);
  r=await mod(P.simple,{status:'APPROVED'},{admin});
  r=await api('GET',`/api/shop/catalogue/products/${P.simple}`);
  check('an APPROVED product is visible again',r.status===200,r.status);
  const audit=Number((await pool.query(`SELECT COUNT(*)::int n FROM howdi_admin_security_audit WHERE action='SHOP_PRODUCT_MODERATION'`)).rows[0].n);
  check('admin moderation is audited',audit>=2,audit);

  // ---------- purchase path: quote and order use the same resolver ----------
  const quote=(items,token=alice.token)=>api('POST','/api/orders/pricing-quote',{token,body:{items}});
  const order=(items,qt,key)=>api('POST','/api/orders',{token:alice.token,headers:{'idempotency-key':key},body:{items,quote_token:qt,payment_method:'COD'}});
  r=await api('POST','/api/orders/pricing-quote',{body:{items:[{product_id:P.simple,quantity:1}]}});
  check('quote without a session -> 401',r.status===401,r.status);
  for(const [label,id] of Object.entries({draft:P.draft,archived:P.archived,scheduled:P.scheduled,moderated:P.moderated,suspendedVendor:P.suspended})){
    r=await quote([{product_id:id,quantity:1}]);
    check(`quote refuses a ${label} product (409)`,r.status===409&&/unavailable/i.test(r.text),{status:r.status,text:r.text.slice(0,150)});
  }
  r=await quote([{product_id:P.variant,quantity:1}]);
  check('quote refuses a variant product without a variant',r.status===409&&/choose an option/i.test(r.text),r.text);
  r=await quote([{product_id:P.variant,variant_id:vOld,quantity:1}]);
  check('quote refuses an inactive variant',r.status===409,r.text);
  r=await quote([{product_id:P.variant,variant_id:vGreen,quantity:1}]);
  check('quote refuses a sold-out variant',r.status===409&&/out of stock/i.test(r.text),r.text);
  // parity: for every purchasable line, the quote subtotal equals the cart-validate line total
  const parity=[[{productId:P.simple,quantity:2},{product_id:P.simple,quantity:2}],
    [{productId:P.variant,variantId:vRed,quantity:2},{product_id:P.variant,variant_id:vRed,quantity:2}],
    [{productId:P.variant,variantId:vBlue,quantity:1},{product_id:P.variant,variant_id:vBlue,quantity:1}],
    [{productId:P.offer,quantity:3},{product_id:P.offer,quantity:3}]];
  for(const [cartLine,quoteLine] of parity){
    const c=(await cv([cartLine])).json.lines[0], q=await quote([quoteLine]);
    check(`price parity cart validate == pricing-quote for ${JSON.stringify(cartLine)}`,q.status===200&&money(q.json.pricing.subtotal)===money(c.lineTotal),{cart:c.lineTotal,quote:q.json&&q.json.pricing&&q.json.pricing.subtotal,text:q.text.slice(0,120)});
  }
  // stale-quote attack: quote first, hide the product, then try to place the order
  let q=await quote([{product_id:P.simple,quantity:1}]);
  await mod(P.simple,{status:'REJECTED'},{admin});
  r=await order([{product_id:P.simple,quantity:1}],q.json.quote_token,'stale-quote-attack-0001');
  const stockNow=Number((await pool.query(`SELECT stock FROM vendor_products WHERE id=$1`,[P.simple])).rows[0].stock);
  check('order path re-applies the visibility gate (product hidden after quoting)',r.status===409&&stockNow===5,{status:r.status,text:r.text.slice(0,150),stockNow});
  await mod(P.simple,{status:'APPROVED'},{admin});
  // variant order: option required at order time too
  q=await quote([{product_id:P.variant,variant_id:vRed,quantity:2}]);
  r=await order([{product_id:P.variant,quantity:2}],q.json.quote_token,'variant-missing-order-01');
  check('order without a variant for a variant product is refused',r.status===409,{status:r.status,text:r.text.slice(0,150)});
  const redStockBefore=Number((await pool.query(`SELECT stock FROM vendor_product_variants WHERE id=$1`,[vRed])).rows[0].stock);
  check('...and nothing was reserved',redStockBefore===3,redStockBefore);
  q=await quote([{product_id:P.variant,variant_id:vRed,quantity:2}]);
  r=await order([{product_id:P.variant,variant_id:vRed,quantity:2}],q.json.quote_token,'variant-good-order-0001');
  check('order for a chosen variant succeeds at the variant price',r.status===201&&r.json.order.items[0].unit_price===800&&r.json.order.subtotal===1600,r.text.slice(0,250));
  const after=(await pool.query(`SELECT (SELECT stock FROM vendor_product_variants WHERE id=$1) v,(SELECT stock FROM vendor_products WHERE id=$2) p`,[vRed,P.variant])).rows[0];
  check('variant stock is decremented and parent stock is the active-variant aggregate',after.v===1&&after.p===(1+2+0),after);
  r=await quote([{product_id:P.variant,variant_id:vRed,quantity:2}]);
  check('quote after the sale reports the remaining stock',r.status===409&&/only 1 left/i.test(r.text),r.text);
  r=await cv([{productId:P.variant,variantId:vRed,quantity:2}]);
  check('cart validate agrees (insufficient_stock, 1 available)',r.json.lines[0].status==='insufficient_stock'&&r.json.lines[0].available===1,r.json.lines[0]);
  // offer product order is charged the offer price
  q=await quote([{product_id:P.offer,quantity:1}]);
  r=await order([{product_id:P.offer,quantity:1}],q.json.quote_token,'offer-order-000000001');
  check('order for an offer product charges the offer price (800), matching what the shopper saw',r.status===201&&r.json.order.items[0].unit_price===800&&r.json.order.grand_total===800,r.text.slice(0,250));
  // simple product order end to end
  q=await quote([{product_id:P.simple,quantity:2}]);
  r=await order([{product_id:P.simple,quantity:2}],q.json.quote_token,'simple-order-00000001');
  const simpleStock=Number((await pool.query(`SELECT stock FROM vendor_products WHERE id=$1`,[P.simple])).rows[0].stock);
  check('simple order succeeds and decrements stock',r.status===201&&simpleStock===3&&r.json.order.subtotal===1000,{status:r.status,simpleStock});

  // ---------- review hardening: no free items, safe ids, campaign lines, lock order ----------
  const freeFlat=await L.mkProduct(vid,'Flat Offer Free',{price:300,offer:{type:'flat',value:500}});
  const zeroPrice=await L.mkProduct(vid,'Unpriced Item',{price:0});
  r=await quote([{product_id:freeFlat,quantity:1}]);
  check('quote refuses an item an offer would make free (409)',r.status===409,{status:r.status,text:r.text.slice(0,150)});
  r=await quote([{product_id:zeroPrice,quantity:1}]);
  check('quote refuses an unpriced item (409)',r.status===409,{status:r.status,text:r.text.slice(0,150)});
  r=await cv([{productId:freeFlat,quantity:1},{productId:zeroPrice,quantity:1}]);
  check('cart validate reports both as unavailable, not ok',r.status===200&&r.json.lines.every((l)=>l.status==='unavailable'),r.json&&r.json.lines);
  r=await order([{product_id:freeFlat,quantity:1}],'x'.repeat(24),'free-item-order-00001');
  check('order refuses a would-be-free item and creates nothing for it',r.status!==201&&r.status<500,{status:r.status,text:r.text.slice(0,150)});
  const freeStock=Number((await pool.query(`SELECT stock FROM vendor_products WHERE id=$1`,[freeFlat])).rows[0].stock);
  check('...and reserves no stock',freeStock===5,freeStock);
  // huge ids never reach the ::bigint cast
  for(const huge of [1e21,'1e21',99999999999999999999,Number.MAX_SAFE_INTEGER+2]){
    const body=`{"items":[{"product_id":${typeof huge==='string'?JSON.stringify(huge):String(huge)},"quantity":1}]}`;
    let rr=await api('POST','/api/orders/pricing-quote',{token:alice.token,body});
    check(`quote with a huge id ${huge} -> 409, no database error text`,rr.status===409&&!/bigint|invalid input|out of range|syntax/i.test(rr.text),{status:rr.status,text:rr.text.slice(0,150)});
    rr=await api('POST','/api/orders',{token:alice.token,headers:{'idempotency-key':'huge-id-order-'+String(huge).replace(/\W/g,'')+'-000'},body:`{"items":[{"product_id":${typeof huge==='string'?JSON.stringify(huge):String(huge)},"quantity":1}],"quote_token":"${'q'.repeat(24)}","payment_method":"COD"}`});
    check(`order with a huge id ${huge} is refused without a 500`,rr.status>=400&&rr.status<500&&!/bigint|invalid input|out of range/i.test(rr.text),{status:rr.status,text:rr.text.slice(0,150)});
  }
  // a Vibe-campaign line is priced on the list price (no stacked vendor offer)
  r=await quote([{product_id:P.offer,quantity:1}]);
  const plainSub=r.json&&r.json.pricing&&r.json.pricing.subtotal;
  r=await quote([{product_id:P.offer,quantity:1,vibe_attribution:{vibeId:'00000000-0000-0000-0000-000000000001'}}]);
  check('plain offer line quotes at the offer price, a campaign-attributed line at the list price',plainSub===800&&r.status===200&&r.json.pricing.subtotal===1000,{plainSub,status:r.status,text:r.text.slice(0,200)});
  // opposite-order carts on the same products never deadlock
  const dA=await L.mkProduct(vid,'Deadlock A',{price:100,stock:50}),dB=await L.mkProduct(vid,'Deadlock B',{price:200,stock:50});
  const ab=[{product_id:dA,quantity:1},{product_id:dB,quantity:1}],ba=[{product_id:dB,quantity:1},{product_id:dA,quantity:1}];
  const runs=[];
  for(let i=0;i<8;i++){
    const items=i%2?ba:ab,qi=await quote(items);
    runs.push(order(items,qi.json.quote_token,'deadlock-order-'+String(i).padStart(6,'0')));
  }
  const done=await Promise.all(runs);
  check('8 concurrent opposite-order carts all succeed (no deadlock 500)',done.every((x)=>x.status===201),done.map((x)=>x.status));
  const dStock=(await pool.query(`SELECT id,stock FROM vendor_products WHERE id=ANY($1::bigint[]) ORDER BY id`,[[dA,dB]])).rows.map((x)=>x.stock);
  check('...and each product lost exactly 8 units',dStock.every((x)=>x===42),dStock);

  await L.finish('shop-s2 product actions');
})().catch(e=>{console.log('CRASH '+(e&&e.stack||e));process.exit(1);});
