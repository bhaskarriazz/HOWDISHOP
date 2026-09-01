import { useEffect, useMemo, useRef, useState } from 'react';

const API = '';

const NAV = [
  ['dashboard', '⌂', 'Control Tower'],
  ['categories', '▦', 'Categories'],
  ['subcategories', '◇', 'Subcategories'],
  ['products', '▣', 'Products'],
  ['variants', '◈', 'Variants & Stock'],
  ['locations', '📍', 'Locations & Delivery'],
  ['inventory', '📦', 'Inventory History'],
  ['coupons', '🎟️', 'Coupons & Promo Codes'],
  ['future', '✦', 'Future Dashboard Lab'],
];

const FUTURE_LAB = [
  { icon: '🌍', title: 'Countries & Regions', text: 'Prepare multi-country operating scopes, currencies and regional controls.', status: 'Reserved' },
  { icon: '🏢', title: 'Branches & Franchise', text: 'Future branch, store and franchise management without rebuilding the catalogue.', status: 'Reserved' },
  { icon: '🎧', title: 'Support / OMS', text: 'Restricted customer support workspace with role-based visibility and audit trails.', status: 'Planned' },
  { icon: '🤝', title: 'Vendor Network', text: 'Vendor onboarding, catalogue ownership, inventory and payout controls.', status: 'Later phase' },
  { icon: '👷', title: 'Worker Operations', text: 'Workforce, tasks, fulfilment and delivery operations.', status: 'Later phase' },
  { icon: '🧶', title: 'Seasonal & Occasion', text: 'Festival, season, wedding, school and local occasion merchandising.', status: 'Foundation' },
  { icon: '🧩', title: 'Collections & Programs', text: 'Admin-created collections and reusable business programs.', status: 'Foundation' },
  { icon: '💡', title: 'Ideas & Opportunities', text: 'A safe place for future business ideas, partnerships and opportunities.', status: 'Reserved' },
];

function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem('howdiAdminToken') || '');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('HOWDI@2026');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminVariants') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [variantSearch, setVariantSearch] = useState('');
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantForm, setVariantForm] = useState({ productId:'', color:'', size:'', sku:'', regularPrice:'', offerPrice:'', discountPercent:'', stock:'', lowStockThreshold:'5', active:true });
  const [locations, setLocations] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminLocations') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [locationSearch, setLocationSearch] = useState('');
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({ pincode:'', city:'', state:'', country:'India', serviceable:true, active:true, standardCharge:'49', expressAvailable:false, expressCharge:'99', freeDeliveryAbove:'999', estimatedDaysMin:'3', estimatedDaysMax:'5' });
  const [inventoryMoves, setInventoryMoves] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminInventoryMoves') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryForm, setInventoryForm] = useState({ variantId:'', mode:'in', quantity:'', reason:'', reference:'' });
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name:'', icon:'🧶', description:'', visible:true, showOnHome:true });
  const [subcategoryForm, setSubcategoryForm] = useState({ categoryId:'', name:'', icon:'🧶', visible:true });
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);

  // PRODUCT STUDIO — structured, media-first product creation.
  const mediaInputRef = useRef(null);
  const blankProductForm = () => ({
    icon:'🧶',
    name:'',
    summary:'',
    description:'',
    brand:'',
    productType:'',
    sku:'',
    barcode:'',
    hsnCode:'',
    categoryId:'',
    subcategoryId:'',
    tags:'',
    media:[],
    specifications:[],
    usage:'',
    care:'',
    material:'',
    sizeType:'standard',
    freeSize:false,
    washable:false,
    washType:'',
    ironable:false,
    ironTemperature:'',
    unit:'piece',
    netWeight:'',
    packageLength:'',
    packageWidth:'',
    packageHeight:'',
    stock:'',
    lowStockThreshold:'5',
    inventoryType:'simple',
    mrp:'',
    sellingPrice:'',
    offerPrice:'',
    costPrice:'',
    gstPercent:'',
    platformChargePercent:'',
    appliedOfferCode:'',
    deliveryMode:'platform',
    deliveryCharge:'',
    freeDeliveryAbove:'',
    returnable:true,
    returnDays:'7',
    customizationAvailable:false,
    customizationNote:'',
    status:'active',
    visible:true,
    featured:false,
    newArrival:false,
    bestSeller:false,
    offerProduct:false
  });
  const [productStudioOpen, setProductStudioOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(blankProductForm);
  const [productStudioSection, setProductStudioSection] = useState('media');

  const [coupons, setCoupons] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminCoupons') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [couponSearch, setCouponSearch] = useState('');
  const [couponForm, setCouponForm] = useState({ code:'', campaignName:'', discountType:'percentage', discountValue:'', minimumOrderValue:'', maximumDiscount:'', startDate:'', endDate:'', usageLimit:'', perCustomerLimit:'1', firstOrderOnly:false, active:true });
  const [editingCoupon, setEditingCoupon] = useState(null);

  const headers = useMemo(() => ({ 'Content-Type':'application/json', 'x-howdi-admin-token':token }), [token]);

  async function api(path, options={}) {
    const response = await fetch(`${API}${path}`, { ...options, headers:{ ...headers, ...(options.headers||{}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  async function loadAll() {
    try {
      const [c,s,p] = await Promise.all([
        api('/api/admin/categories'),
        api('/api/admin/subcategories'),
        api('/api/admin/products')
      ]);
      setCategories(c.categories || []);
      setSubcategories(s.subcategories || []);
      setProducts(p.products || []);
      setNotice('');
    } catch (e) { setNotice(e.message); }
  }

  useEffect(() => { if (token) loadAll(); }, [token]);

  async function login(e) {
    e.preventDefault(); setLoginError('');
    try {
      const response = await fetch(`${API}/api/admin/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Invalid admin credentials');
      localStorage.setItem('howdiAdminToken', data.token);
      setToken(data.token);
    } catch (e) { setLoginError(e.message); }
  }

  async function saveCategory(e) {
    e.preventDefault(); setNotice('');
    try {
      const path = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const data = await api(path, { method: editingCategory ? 'PUT':'POST', body:JSON.stringify(categoryForm) });
      setCategories(items => editingCategory ? items.map(x => x.id===data.category.id ? data.category : x) : [...items, data.category]);
      setCategoryForm({name:'',icon:'🧶',description:'',visible:true,showOnHome:true});
      setEditingCategory(null); setNotice('Category saved.');
    } catch(e) { setNotice(e.message); }
  }

  async function saveSubcategory(e) {
    e.preventDefault(); setNotice('');
    try {
      const path = editingSubcategory ? `/api/admin/subcategories/${editingSubcategory.id}` : '/api/admin/subcategories';
      const data = await api(path, { method: editingSubcategory ? 'PUT':'POST', body:JSON.stringify(subcategoryForm) });
      setSubcategories(items => editingSubcategory ? items.map(x => x.id===data.subcategory.id ? data.subcategory : x) : [...items, data.subcategory]);
      setSubcategoryForm({categoryId:categories[0]?.id||'',name:'',icon:'🧶',visible:true});
      setEditingSubcategory(null); setNotice('Subcategory saved.');
    } catch(e) { setNotice(e.message); }
  }

  async function toggleCategory(item) {
    try {
      const data=await api(`/api/admin/categories/${item.id}`,{method:'PUT',body:JSON.stringify({visible:!item.visible})});
      setCategories(xs=>xs.map(x=>x.id===item.id?data.category:x));
      setNotice(`${item.name} is now ${data.category.visible?'visible':'hidden'}.`);
    } catch(e){setNotice(e.message)}
  }

  async function toggleSubcategory(item) {
    try {
      const data=await api(`/api/admin/subcategories/${item.id}`,{method:'PUT',body:JSON.stringify({visible:!item.visible})});
      setSubcategories(xs=>xs.map(x=>x.id===item.id?data.subcategory:x));
      setNotice(`${item.name} is now ${data.subcategory.visible?'visible':'hidden'}.`);
    } catch(e){setNotice(e.message)}
  }

  async function toggleProduct(item) {
    try {
      const data=await api(`/api/admin/products/${item.id}`,{method:'PUT',body:JSON.stringify({visible:!item.visible})});
      setProducts(xs=>xs.map(x=>x.id===item.id?data.product:x));
      setNotice(`${item.name} is now ${data.product.visible?'visible':'hidden'}.`);
    } catch(e){setNotice(e.message)}
  }


  function persistCoupons(nextCoupons) { setCoupons(nextCoupons); localStorage.setItem('howdiAdminCoupons', JSON.stringify(nextCoupons)); }
  function generateCouponCode() {
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code='';
    do { code='HOWDI-'; for(let i=0;i<6;i+=1) code += chars[Math.floor(Math.random()*chars.length)]; }
    while(coupons.some(item=>String(item.code).toUpperCase()===code));
    setCouponForm(current=>({...current,code}));
  }
  function getCouponStatus(coupon) {
    if(!coupon.active) return 'PAUSED'; const now=new Date();
    if(coupon.startDate){const start=new Date(coupon.startDate); if(!Number.isNaN(start.getTime()) && start>now) return 'SCHEDULED';}
    if(coupon.endDate){const end=new Date(coupon.endDate); if(!Number.isNaN(end.getTime())){if(end<now)return 'EXPIRED'; if((end.getTime()-now.getTime())/36e5<=72)return 'ENDING SOON';}}
    return 'LIVE';
  }
  function resetCouponForm(){setCouponForm({code:'',campaignName:'',discountType:'percentage',discountValue:'',minimumOrderValue:'',maximumDiscount:'',startDate:'',endDate:'',usageLimit:'',perCustomerLimit:'1',firstOrderOnly:false,active:true});setEditingCoupon(null);}
  function persistLocations(nextLocations) { setLocations(nextLocations); localStorage.setItem('howdiAdminLocations', JSON.stringify(nextLocations)); }
  function resetLocationForm() { setLocationForm({ pincode:'', city:'', state:'', country:'India', serviceable:true, active:true, standardCharge:'49', expressAvailable:false, expressCharge:'99', freeDeliveryAbove:'999', estimatedDaysMin:'3', estimatedDaysMax:'5' }); setEditingLocation(null); }
  function saveLocation(e) {
    e.preventDefault();
    const pincode=String(locationForm.pincode||'').trim();
    const city=String(locationForm.city||'').trim();
    const state=String(locationForm.state||'').trim();
    if(!/^\d{6}$/.test(pincode)){setNotice('Enter a valid 6-digit Indian pincode.');return;}
    if(!city || !state){setNotice('City and state are required.');return;}
    const duplicate=locations.some(item=>String(item.pincode)===pincode && item.id!==editingLocation?.id);
    if(duplicate){setNotice('This pincode already exists. Edit the existing location instead.');return;}
    const next={...locationForm,id:editingLocation?.id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,pincode,city,state,country:String(locationForm.country||'India').trim()||'India',standardCharge:Number(locationForm.standardCharge||0),expressCharge:Number(locationForm.expressCharge||0),freeDeliveryAbove:Number(locationForm.freeDeliveryAbove||0),estimatedDaysMin:Number(locationForm.estimatedDaysMin||0),estimatedDaysMax:Number(locationForm.estimatedDaysMax||0),createdAt:editingLocation?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(next.estimatedDaysMax && next.estimatedDaysMin && next.estimatedDaysMax<next.estimatedDaysMin){setNotice('Maximum delivery days cannot be less than minimum delivery days.');return;}
    const nextLocations=editingLocation?locations.map(item=>item.id===next.id?next:item):[next,...locations];
    persistLocations(nextLocations); setNotice(editingLocation?'Location updated successfully.':'Pincode and delivery rule created successfully.'); resetLocationForm();
  }
  function editLocation(item){setEditingLocation(item);setLocationForm({pincode:item.pincode||'',city:item.city||'',state:item.state||'',country:item.country||'India',serviceable:item.serviceable!==false,active:item.active!==false,standardCharge:String(item.standardCharge??49),expressAvailable:!!item.expressAvailable,expressCharge:String(item.expressCharge??99),freeDeliveryAbove:String(item.freeDeliveryAbove??999),estimatedDaysMin:String(item.estimatedDaysMin??3),estimatedDaysMax:String(item.estimatedDaysMax??5)});setTab('locations');window.scrollTo({top:0,behavior:'smooth'});}
  function toggleLocationActive(item){const nextLocations=locations.map(x=>x.id===item.id?{...x,active:!item.active,updatedAt:new Date().toISOString()}:x);persistLocations(nextLocations);setNotice(`${item.pincode} is now ${item.active?'inactive':'active'}.`);}
  function toggleLocationService(item){const nextLocations=locations.map(x=>x.id===item.id?{...x,serviceable:!item.serviceable,updatedAt:new Date().toISOString()}:x);persistLocations(nextLocations);setNotice(`${item.pincode} is now ${item.serviceable?'non-serviceable':'serviceable'}.`);}
  function deleteLocation(item){if(!window.confirm(`Delete pincode ${item.pincode}?`))return;persistLocations(locations.filter(x=>x.id!==item.id));if(editingLocation?.id===item.id)resetLocationForm();setNotice('Location deleted.');}

  function saveCoupon(e){
    e.preventDefault(); const code=couponForm.code.trim().toUpperCase();
    if(!code){setNotice('Enter or generate a coupon code.');return;}
    if(!couponForm.discountValue || Number(couponForm.discountValue)<=0){setNotice('Enter a valid discount value.');return;}
    const duplicate=coupons.some(item=>String(item.code).toUpperCase()===code && item.id!==editingCoupon?.id);
    if(duplicate){setNotice('This coupon code already exists. Generate or enter a different code.');return;}
    const nextCoupon={...couponForm,id:editingCoupon?.id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,code,discountValue:Number(couponForm.discountValue),minimumOrderValue:Number(couponForm.minimumOrderValue||0),maximumDiscount:Number(couponForm.maximumDiscount||0),usageLimit:Number(couponForm.usageLimit||0),perCustomerLimit:Math.max(1,Number(couponForm.perCustomerLimit||1)),createdAt:editingCoupon?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const nextCoupons=editingCoupon?coupons.map(item=>item.id===nextCoupon.id?nextCoupon:item):[nextCoupon,...coupons];
    persistCoupons(nextCoupons); setNotice(editingCoupon?'Coupon updated successfully.':'Coupon created successfully.'); resetCouponForm();
  }
  function editCoupon(coupon){setEditingCoupon(coupon);setCouponForm({code:coupon.code||'',campaignName:coupon.campaignName||'',discountType:coupon.discountType||'percentage',discountValue:coupon.discountValue??'',minimumOrderValue:coupon.minimumOrderValue??'',maximumDiscount:coupon.maximumDiscount??'',startDate:coupon.startDate||'',endDate:coupon.endDate||'',usageLimit:coupon.usageLimit??'',perCustomerLimit:coupon.perCustomerLimit??'1',firstOrderOnly:Boolean(coupon.firstOrderOnly),active:coupon.active!==false});setTab('coupons');}
  function toggleCoupon(coupon){persistCoupons(coupons.map(item=>item.id===coupon.id?{...item,active:!item.active}:item));setNotice(`${coupon.code} is now ${coupon.active?'paused':'active'}.`);}
  function deleteCoupon(coupon){if(!window.confirm(`Delete coupon "${coupon.code}"?`))return;persistCoupons(coupons.filter(item=>item.id!==coupon.id));setNotice('Coupon deleted.');}
  const filteredCoupons=coupons.filter(coupon=>{const q=couponSearch.trim().toLowerCase();return !q||[coupon.code,coupon.campaignName].filter(Boolean).join(' ').toLowerCase().includes(q);});

  function persistInventoryMoves(nextMoves) { setInventoryMoves(nextMoves); localStorage.setItem('howdiAdminInventoryMoves', JSON.stringify(nextMoves)); }
  function saveInventoryMove(e) {
    e.preventDefault(); setNotice('');
    const variant=variants.find(v=>String(v.id)===String(inventoryForm.variantId));
    if(!variant){ setNotice('Select a variant first.'); return; }
    const qty=Number(inventoryForm.quantity||0);
    if(!Number.isFinite(qty) || qty<0){ setNotice('Enter a valid stock quantity.'); return; }
    const before=Number(variant.stock||0);
    let after=before;
    if(inventoryForm.mode==='in'){ if(qty<=0){setNotice('Stock In quantity must be greater than 0.');return;} after=before+qty; }
    if(inventoryForm.mode==='out'){ if(qty<=0){setNotice('Stock Out quantity must be greater than 0.');return;} if(qty>before){setNotice('Stock Out cannot exceed available stock.');return;} after=before-qty; }
    if(inventoryForm.mode==='set'){ after=qty; }
    const move={ id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`, variantId:variant.id, sku:variant.sku, productId:variant.productId, productName:variantProductName(variant.productId), color:variant.color||'', size:variant.size||'', mode:inventoryForm.mode, quantity:qty, before, after, delta:after-before, reason:String(inventoryForm.reason||'').trim()||'Manual inventory update', reference:String(inventoryForm.reference||'').trim(), createdAt:new Date().toISOString() };
    persistVariants(variants.map(v=>v.id===variant.id?{...v,stock:after,updatedAt:new Date().toISOString()}:v));
    persistInventoryMoves([move,...inventoryMoves]);
    setInventoryForm({ variantId:'', mode:'in', quantity:'', reason:'', reference:'' });
    setNotice(`Inventory updated: ${variant.sku} is now ${after} in stock.`);
  }
  function inventoryVariantLabel(v){ return `${variantProductName(v.productId)} · ${v.sku}${v.color?` · ${v.color}`:''}${v.size?` / ${v.size}`:''}`; }
  function persistVariants(nextVariants) { setVariants(nextVariants); localStorage.setItem('howdiAdminVariants', JSON.stringify(nextVariants)); }
  function resetVariantForm(){ setVariantForm({ productId:products[0]?.id||'', color:'', size:'', sku:'', regularPrice:'', offerPrice:'', discountPercent:'', stock:'', lowStockThreshold:'5', active:true }); setEditingVariant(null); }
  function variantProductName(id){ return products.find(p=>String(p.id)===String(id))?.name || 'Unknown product'; }
  function generateVariantSku(){
    const product = products.find(p=>String(p.id)===String(variantForm.productId));
    const base = String(product?.name||'HOWDI').replace(/[^a-z0-9]/gi,'').slice(0,6).toUpperCase() || 'HOWDI';
    const color = String(variantForm.color||'VAR').replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase() || 'VAR';
    const size = String(variantForm.size||'ONE').replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase() || 'ONE';
    let sku=''; do { sku=`HOWDI-${base}-${color}-${size}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; } while(variants.some(v=>String(v.sku).toUpperCase()===sku && v.id!==editingVariant?.id));
    setVariantForm(current=>({...current,sku}));
  }
  function updateVariantRegularPrice(value){
    const regularPrice=value; const discount=Number(variantForm.discountPercent||0); const offer=Number(regularPrice||0)*(1-discount/100);
    setVariantForm(current=>({...current,regularPrice,offerPrice:discount>0?offer.toFixed(2):current.offerPrice}));
  }
  function updateVariantOfferPrice(value){
    const regular=Number(variantForm.regularPrice||0); const offer=Number(value||0); const discount=regular>0 && offer>=0 && offer<=regular ? ((regular-offer)/regular)*100 : 0;
    setVariantForm(current=>({...current,offerPrice:value,discountPercent:regular>0?discount.toFixed(2):''}));
  }
  function updateVariantDiscount(value){
    const discount=Math.min(100,Math.max(0,Number(value||0))); const regular=Number(variantForm.regularPrice||0); const offer=regular>0 ? regular*(1-discount/100) : 0;
    setVariantForm(current=>({...current,discountPercent:value,offerPrice:regular>0?offer.toFixed(2):current.offerPrice}));
  }
  function saveVariant(e){
    e.preventDefault();
    if(!variantForm.productId){setNotice('Select a product for this variant.');return;}
    const sku=variantForm.sku.trim().toUpperCase();
    if(!sku){setNotice('Enter or generate a unique SKU.');return;}
    const duplicate=variants.some(v=>String(v.sku).toUpperCase()===sku && v.id!==editingVariant?.id);
    if(duplicate){setNotice('This SKU already exists. Generate or enter a different SKU.');return;}
    const regularPrice=Number(variantForm.regularPrice||0); const offerPrice=Number(variantForm.offerPrice||0); const stock=Number(variantForm.stock||0); const threshold=Math.max(0,Number(variantForm.lowStockThreshold||5));
    if(regularPrice<=0){setNotice('Enter a valid regular price.');return;}
    if(offerPrice<0 || offerPrice>regularPrice){setNotice('Offer price must be between ₹0 and the regular price.');return;}
    if(stock<0){setNotice('Stock cannot be negative.');return;}
    const discountPercent=regularPrice>0 && offerPrice>0 ? Number((((regularPrice-offerPrice)/regularPrice)*100).toFixed(2)) : Number(variantForm.discountPercent||0);
    const next={...variantForm,id:editingVariant?.id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,sku,regularPrice,offerPrice:offerPrice||regularPrice,discountPercent:offerPrice>0?discountPercent:0,stock,lowStockThreshold:threshold,active:variantForm.active!==false,createdAt:editingVariant?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    persistVariants(editingVariant?variants.map(v=>v.id===next.id?next:v):[next,...variants]); setNotice(editingVariant?'Variant updated successfully.':'Variant created successfully.'); resetVariantForm();
  }
  function editVariant(v){setEditingVariant(v);setVariantForm({productId:v.productId||'',color:v.color||'',size:v.size||'',sku:v.sku||'',regularPrice:v.regularPrice??'',offerPrice:v.offerPrice??'',discountPercent:v.discountPercent??'',stock:v.stock??'',lowStockThreshold:v.lowStockThreshold??'5',active:v.active!==false});setTab('variants');}
  function toggleVariant(v){persistVariants(variants.map(item=>item.id===v.id?{...item,active:!item.active,updatedAt:new Date().toISOString()}:item));setNotice(`${v.sku} is now ${v.active?'inactive':'active'}.`);}
  function deleteVariant(v){if(!window.confirm(`Delete variant ${v.sku}?`))return;persistVariants(variants.filter(item=>item.id!==v.id));setNotice('Variant deleted.');}
  const filteredVariants=variants.filter(v=>{const q=variantSearch.trim().toLowerCase();return !q||[v.sku,v.color,v.size,variantProductName(v.productId)].filter(Boolean).join(' ').toLowerCase().includes(q);});


  function openProductStudio(product=null){
    if(product){
      setEditingProduct(product);
      setProductForm({
        ...blankProductForm(),
        ...product,
        tags:Array.isArray(product.tags)?product.tags.join(', '):String(product.tags||''),
        media:Array.isArray(product.media)?product.media:[],
        specifications:Array.isArray(product.specifications)?product.specifications:[],
        summary:product.summary||product.shortSummary||'',
        usage:product.usage||'',
        care:product.care||'',
        unit:product.unit||'piece',
        inventoryType:product.inventoryType||'simple',
        sizeType:product.sizeType||'standard',
        freeSize:Boolean(product.freeSize),
        washable:Boolean(product.washable),
        ironable:Boolean(product.ironable),
        returnable:product.returnable!==false,
        customizationAvailable:Boolean(product.customizationAvailable),
        visible:product.visible!==false,
      });
    }else{
      setEditingProduct(null);
      setProductForm(blankProductForm());
    }
    setProductStudioSection('media');
    setProductStudioOpen(true);
    setTab('products');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function closeProductStudio(){
    setProductStudioOpen(false);
    setEditingProduct(null);
    setProductForm(blankProductForm());
  }

  function setProductField(key,value){
    setProductForm(current=>({...current,[key]:value}));
  }

  function addSpecification(){
    setProductForm(current=>({...current,specifications:[...(current.specifications||[]),{label:'',value:''}]}));
  }

  function updateSpecification(index,key,value){
    setProductForm(current=>({...current,specifications:(current.specifications||[]).map((item,i)=>i===index?{...item,[key]:value}:item)}));
  }

  function removeSpecification(index){
    setProductForm(current=>({...current,specifications:(current.specifications||[]).filter((_,i)=>i!==index)}));
  }

  function generateProductSku(){
    const base=String(productForm.name||productForm.brand||'HOWDI').replace(/[^a-z0-9]/gi,'').slice(0,10).toUpperCase()||'HOWDI';
    let sku='';
    do { sku=`HOWDI-${base}-${Math.random().toString(36).slice(2,8).toUpperCase()}`; }
    while(products.some(item=>String(item.sku||'').toUpperCase()===sku && item.id!==editingProduct?.id));
    setProductField('sku',sku);
  }

  async function readAndCompressImage(file){
    const source=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=reject;
      reader.readAsDataURL(file);
    });
    if(!String(file.type||'').startsWith('image/')) return {id:`media-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,url:source,name:file.name,type:file.type,size:file.size};
    const image=await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=reject;
      img.src=source;
    });
    const max=1400;
    const scale=Math.min(1,max/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.width*scale));
    canvas.height=Math.max(1,Math.round(image.height*scale));
    const ctx=canvas.getContext('2d');
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const url=canvas.toDataURL('image/jpeg',0.84);
    return {id:`media-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,url,name:file.name,type:'image/jpeg',size:file.size};
  }

  async function addProductMedia(files){
    const selected=Array.from(files||[]).slice(0,8);
    if(!selected.length) return;
    try{
      const next=await Promise.all(selected.map(readAndCompressImage));
      setProductForm(current=>({...current,media:[...(current.media||[]),...next].slice(0,8)}));
      setNotice(`${next.length} product photo${next.length>1?'s':''} added.`);
    }catch(error){ setNotice('One or more images could not be processed.'); }
  }

  function removeProductMedia(id){
    setProductForm(current=>({...current,media:(current.media||[]).filter(item=>item.id!==id)}));
  }

  function aiAssistProduct(){
    const category=categories.find(c=>String(c.id)===String(productForm.categoryId))?.name||'';
    const subcategory=subcategories.find(c=>String(c.id)===String(productForm.subcategoryId))?.name||'';
    const seed=[productForm.name,productForm.brand,category,subcategory,productForm.material].filter(Boolean).join(' ');
    if(!seed.trim()){ setNotice('Enter a product name or choose a category before using AI Assist.'); return; }
    const words=seed.trim().split(/\s+/).slice(0,10).join(' ');
    const suggestedSummary=productForm.summary || `A carefully selected ${words.toLowerCase()} for everyday use and gifting.`;
    const suggestedDescription=productForm.description || `${words}.\n\nKey highlights\n• Carefully prepared for HOWDI customers\n• Product details can be reviewed before publishing\n• Please confirm material, size and care information before going live`;
    const suggestedUsage=productForm.usage || 'Daily use\nGifting\nPersonal use';
    const nextTags=productForm.tags || [category,subcategory,productForm.brand,productForm.productType].filter(Boolean).join(', ');
    setProductForm(current=>({...current,summary:suggestedSummary,description:suggestedDescription,usage:suggestedUsage,tags:nextTags}));
    setNotice('AI Assist suggestions added. Review them before publishing. Photo-vision AI can be connected next with a provider key.');
  }

  async function saveProduct(e){
    e.preventDefault();
    setNotice('');
    if(!productForm.name.trim()){ setNotice('Product name is required.'); return; }
    if(!productForm.categoryId){ setNotice('Select a product category.'); return; }
    if(productForm.sellingPrice!=='' && Number(productForm.sellingPrice)<0){ setNotice('Selling price cannot be negative.'); return; }
    if(productForm.mrp!=='' && productForm.sellingPrice!=='' && Number(productForm.sellingPrice)>Number(productForm.mrp)){ setNotice('Selling price cannot be greater than MRP.'); return; }
    if(productForm.media.some(item=>String(item.url||'').length>2500000)){ setNotice('One image is too large. Please use a smaller photo.'); return; }
    const payload={
      ...productForm,
      name:productForm.name.trim(),
      summary:productForm.summary.trim(),
      description:productForm.description.trim(),
      brand:productForm.brand.trim(),
      productType:productForm.productType.trim(),
      sku:productForm.sku.trim(),
      tags:productForm.tags.split(',').map(item=>item.trim()).filter(Boolean),
      specifications:(productForm.specifications||[]).filter(item=>String(item.label||'').trim()||String(item.value||'').trim())
    };
    try{
      const path=editingProduct?`/api/admin/products/${editingProduct.id}`:'/api/admin/products';
      const data=await api(path,{method:editingProduct?'PUT':'POST',body:JSON.stringify(payload)});
      setProducts(items=>editingProduct?items.map(item=>item.id===data.product.id?data.product:item):[data.product,...items]);
      setNotice(editingProduct?'Product updated successfully.':'Product published successfully.');
      closeProductStudio();
    }catch(error){ setNotice(error.message); }
  }

  const categoryName = id => categories.find(c=>String(c.id)===String(id))?.name || '—';
  const visibleCategories = categories.filter(x => x.visible !== false).length;
  const visibleSubcategories = subcategories.filter(x => x.visible !== false).length;
  const visibleProducts = products.filter(x => x.visible !== false).length;
  const lowStock = variants.length ? variants.filter(x => Number(x.stock ?? 0) <= Number(x.lowStockThreshold ?? 5)).length : products.filter(x => Number(x.stock ?? 99) <= 5).length;
  const filteredLocations = locations.filter(item => `${item.pincode} ${item.city} ${item.state} ${item.country}`.toLowerCase().includes(locationSearch.toLowerCase().trim()));
  const filteredInventoryMoves = inventoryMoves.filter(m=>{const q=inventorySearch.trim().toLowerCase();return !q||[m.sku,m.productName,m.color,m.size,m.reason,m.reference,m.mode].filter(Boolean).join(' ').toLowerCase().includes(q);});

  const filteredProducts = products.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [p.name, p.brand, p.subcategory, categoryName(p.categoryId)].filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  if (!token) return (
    <div className="login-page">
      <form className="login-card" onSubmit={login}>
        <div className="brand large">🧶 <span>HOWDI</span><small>ADMIN</small></div>
        <div className="eyebrow">CROCHET GRANDMA · CONTROL TOWER</div>
        <h1>Welcome back.</h1>
        <p>One calm place to run the catalogue, today’s business and tomorrow’s expansion.</p>
        <label>Username<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></label>
        {loginError&&<div className="error">{loginError}</div>}
        <button className="primary full-btn">Sign in</button>
      </form>
    </div>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">🧶 <span>HOWDI</span><small>ADMIN</small></div>
        <div className="tagline">Crochet Grandma · Control Tower</div>
        <div className="workspace-chip"><span className="dot"/> Production foundation <b>TEST</b></div>
        <nav>
          {NAV.map(([id,icon,label])=>(
            <button className={tab===id?'active':''} onClick={()=>{setTab(id);setSearch('')}} key={id}>
              <span className="nav-icon">{icon}</span><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="future-note"><span>🧭</span><div><b>Built for tomorrow</b><small>Expansion slots are reserved.</small></div></div>
          <button className="logout" onClick={()=>{localStorage.removeItem('howdiAdminToken');setToken('')}}>Sign out</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <div className="eyebrow">HOWDI.SHOP ADMIN</div>
            <h1>{tab==='dashboard'?'Control Tower':tab==='categories'?'Categories':tab==='subcategories'?'Subcategories':tab==='products'?'Products':tab==='variants'?'Variants & Stock':tab==='locations'?'Locations & Delivery':tab==='inventory'?'Inventory Movement & History':tab==='coupons'?'Coupons & Promo Codes':'Future Dashboard Lab'}</h1>
            <p>{tab==='dashboard'?'See what needs attention now — and what HOWDI can become next.':tab==='future'?'Reserved capacity for ideas, branches, countries and future businesses.':tab==='locations'?'Control customer serviceability and delivery rules by pincode.':tab==='coupons'?'Create unique promo codes and prepare future campaign rules without disturbing the catalogue.':'Catalogue controls are the source of truth for customer discovery.'}</p>
          </div>
          <div className="top-actions">
            <span className="live-pill"><span className="dot"/> Admin connected</span>
            <button className="refresh" onClick={loadAll}>↻ Refresh</button>
          </div>
        </header>

        {notice&&<div className="notice">{notice}<button onClick={()=>setNotice('')}>×</button></div>}

        {tab==='dashboard' && (
          <div className="page">
            <section className="welcome-card">
              <div><span className="kicker">🧶 CROCHET GRANDMA PRINCIPLE</span><h2>Simple to use. Strong underneath.</h2><p>HOWDI’s Admin grows with the business instead of forcing the business to rebuild the system.</p></div>
              <button className="primary" onClick={()=>setTab('categories')}>Open catalogue →</button>
            </section>

            <div className="metric-grid">
              {[
                ['Categories',categories.length,`${visibleCategories} visible`,'▦'],
                ['Subcategories',subcategories.length,`${visibleSubcategories} visible`,'◇'],
                ['Products',products.length,`${visibleProducts} visible`,'▣'],
                ['Variants',variants.length,`${variants.filter(v=>v.active!==false).length} active`,'◈'],
                ['Serviceable pincodes',locations.filter(l=>l.active!==false && l.serviceable!==false).length,`${locations.length} total`,'📍'],
                ['Coupons',coupons.length,`${coupons.filter(c=>getCouponStatus(c)==='LIVE').length} live`,'🎟️'],
                ['Attention',lowStock,lowStock?'Review low-stock items':'No immediate flags','!']
              ].map(([label,value,meta,icon])=><div className="metric" key={label}><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div></div>)}
            </div>

            <div className="dashboard-grid">
              <section className="panel">
                <div className="panel-head"><div><span className="eyebrow">OPERATING PULSE</span><h3>Catalogue readiness</h3></div><button onClick={()=>setTab('products')}>View products →</button></div>
                <div className="readiness">
                  {[
                    ['Categories', categories.length>0],
                    ['Subcategories', subcategories.length>0],
                    ['Products', products.length>0],
                    ['Seasonal / Occasion slot', true],
                    ['Collections / Programs slot', true],
                    ['Future expansion capacity', true],
                  ].map(([name,ok])=><div className="readiness-row" key={name}><span className={ok?'checkmark':'empty'}>{ok?'✓':'○'}</span><span>{name}</span><b>{ok?'Ready':'Next'}</b></div>)}
                </div>
              </section>
              <section className="panel decision">
                <div className="panel-head"><div><span className="eyebrow">HOWDI INTELLIGENCE</span><h3>Decision Canvas</h3></div><span className="reserved">FOUNDATION</span></div>
                <div className="decision-item"><span>💡</span><div><b>What should happen next?</b><p>Use catalogue signals, inventory and customer behaviour to surface decisions here later.</p></div></div>
                <div className="decision-item"><span>⚠️</span><div><b>Why is this happening?</b><p>Future OMS and analytics can explain sales, returns, demand and capacity without hunting through reports.</p></div></div>
                <button className="lab-link" onClick={()=>setTab('future')}>Explore Future Dashboard Lab →</button>
              </section>
            </div>

            <section className="panel expansion">
              <div className="panel-head"><div><span className="eyebrow">EXPANSION READY</span><h3>Future capacity map</h3></div><span className="reserved">RESERVED</span></div>
              <div className="expansion-grid">
                {[
                  ['🌍','Countries','Multi-country catalogue and currency scope'],
                  ['🏢','Branches','Branches, stores and franchise-ready structure'],
                  ['🎧','Support / OMS','Restricted operational visibility by role'],
                  ['🤝','Vendors','Vendor-owned catalogue and commercial controls'],
                ].map(([icon,title,text])=><div className="future-card" key={title}><span>{icon}</span><div><b>{title}</b><p>{text}</p></div><small>Later</small></div>)}
              </div>
            </section>
          </div>
        )}

        {tab==='future' && (
          <div className="page">
            <section className="lab-hero"><span className="lab-symbol">✦</span><div><span className="eyebrow">FUTURE DASHBOARD LAB</span><h2>Reserve the desks before we need them.</h2><p>These are intentional extension points — not unfinished promises. We activate them when the real business requires them.</p></div></section>
            <div className="lab-grid">{FUTURE_LAB.map(item=><article className="lab-card" key={item.title}><div className="lab-card-top"><span>{item.icon}</span><em>{item.status}</em></div><h3>{item.title}</h3><p>{item.text}</p><button onClick={()=>setNotice(`${item.title} is reserved for a future phase.`)}>View blueprint →</button></article>)}</div>
          </div>
        )}

        {tab==='categories' && (
          <div className="page"><section className="workspace"><form className="editor panel" onSubmit={saveCategory}><div className="panel-head"><div><span className="eyebrow">CATALOGUE ROOT</span><h3>{editingCategory?'Edit category':'Create category'}</h3></div></div><input placeholder="Category name" value={categoryForm.name} onChange={e=>setCategoryForm({...categoryForm,name:e.target.value})} required/><div className="row"><input placeholder="Icon" value={categoryForm.icon} onChange={e=>setCategoryForm({...categoryForm,icon:e.target.value})}/><input placeholder="Description" value={categoryForm.description} onChange={e=>setCategoryForm({...categoryForm,description:e.target.value})}/></div><label className="check"><input type="checkbox" checked={categoryForm.visible} onChange={e=>setCategoryForm({...categoryForm,visible:e.target.checked})}/> Visible to customers</label><label className="check"><input type="checkbox" checked={categoryForm.showOnHome} onChange={e=>setCategoryForm({...categoryForm,showOnHome:e.target.checked})}/> Show on homepage</label><div className="actions"><button className="primary">{editingCategory?'Update':'Add category'}</button>{editingCategory&&<button type="button" onClick={()=>{setEditingCategory(null);setCategoryForm({name:'',icon:'🧶',description:'',visible:true,showOnHome:true})}}>Cancel</button>}</div></form><div className="panel list"><div className="list-head"><div><span className="eyebrow">CURRENT CATALOGUE</span><h3>{categories.length} categories</h3></div></div>{categories.map(c=><div className="item" key={c.id}><div className="icon">{c.icon}</div><div className="grow"><strong>{c.name}</strong><span>{c.description||'No description'}</span></div><span className={c.visible?'pill on':'pill off'}>{c.visible?'VISIBLE':'HIDDEN'}</span><button onClick={()=>toggleCategory(c)}>{c.visible?'Hide':'Show'}</button><button onClick={()=>{setEditingCategory(c);setCategoryForm({name:c.name,icon:c.icon||'🧶',description:c.description||'',visible:c.visible!==false,showOnHome:c.showOnHome!==false})}}>Edit</button></div>)}</div></section></div>
        )}

        {tab==='subcategories' && (
          <div className="page"><section className="workspace"><form className="editor panel" onSubmit={saveSubcategory}><div className="panel-head"><div><span className="eyebrow">CATALOGUE BRANCH</span><h3>{editingSubcategory?'Edit subcategory':'Create subcategory'}</h3></div></div><select value={subcategoryForm.categoryId} onChange={e=>setSubcategoryForm({...subcategoryForm,categoryId:e.target.value})} required><option value="">Select parent category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select><div className="row"><input placeholder="Subcategory name" value={subcategoryForm.name} onChange={e=>setSubcategoryForm({...subcategoryForm,name:e.target.value})} required/><input placeholder="Icon" value={subcategoryForm.icon} onChange={e=>setSubcategoryForm({...subcategoryForm,icon:e.target.value})}/></div><label className="check"><input type="checkbox" checked={subcategoryForm.visible} onChange={e=>setSubcategoryForm({...subcategoryForm,visible:e.target.checked})}/> Visible to customers</label><div className="actions"><button className="primary">{editingSubcategory?'Update':'Add subcategory'}</button>{editingSubcategory&&<button type="button" onClick={()=>{setEditingSubcategory(null);setSubcategoryForm({categoryId:categories[0]?.id||'',name:'',icon:'🧶',visible:true})}}>Cancel</button>}</div></form><div className="panel list"><div className="list-head"><div><span className="eyebrow">CURRENT CATALOGUE</span><h3>{subcategories.length} subcategories</h3></div></div>{subcategories.map(s=><div className="item" key={s.id}><div className="icon">{s.icon}</div><div className="grow"><strong>{s.name}</strong><span>{categoryName(s.categoryId)}</span></div><span className={s.visible?'pill on':'pill off'}>{s.visible?'VISIBLE':'HIDDEN'}</span><button onClick={()=>toggleSubcategory(s)}>{s.visible?'Hide':'Show'}</button><button onClick={()=>{setEditingSubcategory(s);setSubcategoryForm({categoryId:s.categoryId,name:s.name,icon:s.icon||'🧶',visible:s.visible!==false})}}>Edit</button></div>)}</div></section></div>
        )}

        {tab==='products' && (
          <div className="page">
            {productStudioOpen ? (
              <form className="product-studio" onSubmit={saveProduct}>
                <div className="studio-hero">
                  <div>
                    <span className="eyebrow">HOWDI PRODUCT STUDIO</span>
                    <h2>{editingProduct?'Edit product':'Create a marketplace-ready product'}</h2>
                    <p>Media first, structured information, inventory, offers and delivery controls in one guided workspace.</p>
                  </div>
                  <div className="studio-actions">
                    <button type="button" onClick={aiAssistProduct}>✨ HOWDI AI Assist</button>
                    <button type="button" onClick={closeProductStudio}>← Back to products</button>
                    <button className="primary">{editingProduct?'Save changes':'Publish product'}</button>
                  </div>
                </div>

                <div className="studio-nav">
                  {[
                    ['media','📸 Media & AI'],
                    ['basic','📝 Product information'],
                    ['details','📖 Details & care'],
                    ['specs','⚙️ Specifications'],
                    ['commerce','💰 Price & offers'],
                    ['inventory','📦 Inventory'],
                    ['delivery','🚚 Delivery & publish']
                  ].map(([id,label])=><button type="button" key={id} className={productStudioSection===id?'active':''} onClick={()=>setProductStudioSection(id)}>{label}</button>)}
                </div>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>01</span><div><h3>Product media studio</h3><p>Upload up to 8 photos. The first image becomes the main customer image.</p></div></div>
                  <div className="media-drop" onClick={()=>mediaInputRef.current?.click()}>
                    <div className="media-drop-icon">📷</div>
                    <strong>Upload or capture product photos</strong>
                    <small>JPG, PNG or WebP · photos are resized for faster catalogue loading</small>
                    <button type="button">Choose photos</button>
                    <input ref={mediaInputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={e=>addProductMedia(e.target.files)}/>
                  </div>
                  <div className="media-grid">
                    {(productForm.media||[]).map((item,index)=><div className="media-card" key={item.id}>
                      <img src={item.url} alt={item.name||`Product ${index+1}`}/>
                      {index===0&&<span>MAIN PHOTO</span>}
                      <button type="button" onClick={()=>removeProductMedia(item.id)}>×</button>
                    </div>)}
                  </div>
                  <div className="ai-note"><strong>🤖 AI Photo & Detail Assist</strong><p>Use AI Assist to generate starter copy from the information entered. Real photo-vision/background AI will be connected as the next integration so the product itself is never silently changed.</p><button type="button" onClick={aiAssistProduct}>Generate suggestions</button></div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>02</span><div><h3>Product identity</h3><p>Required fields are marked with *</p></div></div>
                  <div className="studio-form-grid">
                    <label className="wide">Product name *<input value={productForm.name} onChange={e=>setProductField('name',e.target.value)} placeholder="Example: Handmade Crochet Shoulder Bag" required/></label>
                    <label className="wide">Product summary<input value={productForm.summary} onChange={e=>setProductField('summary',e.target.value)} placeholder="Short customer-friendly summary"/></label>
                    <label>Category *<select value={productForm.categoryId} onChange={e=>setProductForm(current=>({...current,categoryId:e.target.value,subcategoryId:''}))} required><option value="">Select category</option>{categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    <label>Subcategory<select value={productForm.subcategoryId} onChange={e=>setProductField('subcategoryId',e.target.value)}><option value="">Select subcategory</option>{subcategories.filter(item=>String(item.categoryId)===String(productForm.categoryId)).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    <label>Brand name<input value={productForm.brand} onChange={e=>setProductField('brand',e.target.value)} placeholder="Optional"/></label>
                    <label>Product type<input value={productForm.productType} onChange={e=>setProductField('productType',e.target.value)} placeholder="Bag, Top, Table Runner..."/></label>
                    <label>SKU<input value={productForm.sku} onChange={e=>setProductField('sku',e.target.value)} placeholder="Unique seller SKU"/></label>
                    <div className="inline-field"><label>Generate SKU</label><button type="button" onClick={generateProductSku}>Generate unique SKU</button></div>
                    <label>Barcode<input value={productForm.barcode} onChange={e=>setProductField('barcode',e.target.value)} placeholder="Optional"/></label>
                    <label>HSN code<input value={productForm.hsnCode} onChange={e=>setProductField('hsnCode',e.target.value)} placeholder="Optional"/></label>
                    <label className="wide">Search tags<input value={productForm.tags} onChange={e=>setProductField('tags',e.target.value)} placeholder="handmade, crochet, gift, local business"/></label>
                  </div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>03</span><div><h3>Description, usage & care</h3><p>Keep the important information structured so customers can scan it quickly.</p></div></div>
                  <div className="studio-form-grid">
                    <label className="wide">Full product description<textarea rows="7" value={productForm.description} onChange={e=>setProductField('description',e.target.value)} placeholder="Tell the customer what makes this product useful and special..."/></label>
                    <label>Material<input value={productForm.material} onChange={e=>setProductField('material',e.target.value)} placeholder="Cotton yarn, iron, wood..."/></label>
                    <label>Size type<select value={productForm.sizeType} onChange={e=>setProductField('sizeType',e.target.value)}><option value="standard">Standard sizes</option><option value="free">Free size</option><option value="custom">Custom size</option></select></label>
                    <label className="wide">Usage<textarea rows="4" value={productForm.usage} onChange={e=>setProductField('usage',e.target.value)} placeholder="Daily use, gifting, travel..."/></label>
                    <label className="wide">Care instructions<textarea rows="4" value={productForm.care} onChange={e=>setProductField('care',e.target.value)} placeholder="Wash, storage and maintenance instructions"/></label>
                  </div>
                  <div className="check-grid">
                    <label className="check"><input type="checkbox" checked={productForm.freeSize} onChange={e=>setProductField('freeSize',e.target.checked)}/> Free size</label>
                    <label className="check"><input type="checkbox" checked={productForm.washable} onChange={e=>setProductField('washable',e.target.checked)}/> Washable</label>
                    <label>Wash type<select value={productForm.washType} onChange={e=>setProductField('washType',e.target.value)}><option value="">Not specified</option><option>Hand wash</option><option>Machine wash</option><option>Dry clean only</option></select></label>
                    <label className="check"><input type="checkbox" checked={productForm.ironable} onChange={e=>setProductField('ironable',e.target.checked)}/> Ironable</label>
                    <label>Iron temperature<select value={productForm.ironTemperature} onChange={e=>setProductField('ironTemperature',e.target.value)}><option value="">Not specified</option><option>Low</option><option>Medium</option><option>High</option></select></label>
                  </div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>04</span><div><h3>Specifications</h3><p>Add only the attributes relevant to this product. This keeps one product system flexible across categories.</p></div><button type="button" onClick={addSpecification}>+ Add specification</button></div>
                  <div className="spec-list">
                    {(productForm.specifications||[]).map((item,index)=><div className="spec-row" key={index}><input value={item.label||''} onChange={e=>updateSpecification(index,'label',e.target.value)} placeholder="Specification (e.g. Dimensions)"/><input value={item.value||''} onChange={e=>updateSpecification(index,'value',e.target.value)} placeholder="Value (e.g. 30 × 20 cm)"/><button type="button" onClick={()=>removeSpecification(index)}>Remove</button></div>)}
                    {!(productForm.specifications||[]).length&&<div className="empty-state">No specifications yet. Add material, dimensions, capacity, compatibility or other product-specific details.</div>}
                  </div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>05</span><div><h3>Price & offer application</h3><p>The product price stays separate from campaigns so offers can be enabled only when eligible.</p></div></div>
                  <div className="studio-form-grid">
                    <label>MRP ₹<input type="number" min="0" step="0.01" value={productForm.mrp} onChange={e=>setProductField('mrp',e.target.value)}/></label>
                    <label>Selling price ₹<input type="number" min="0" step="0.01" value={productForm.sellingPrice} onChange={e=>setProductField('sellingPrice',e.target.value)} required/></label>
                    <label>Direct offer price ₹<input type="number" min="0" step="0.01" value={productForm.offerPrice} onChange={e=>setProductField('offerPrice',e.target.value)}/></label>
                    <label>Cost price ₹<input type="number" min="0" step="0.01" value={productForm.costPrice} onChange={e=>setProductField('costPrice',e.target.value)}/></label>
                    <label>GST %<input type="number" min="0" step="0.01" value={productForm.gstPercent} onChange={e=>setProductField('gstPercent',e.target.value)}/></label>
                    <label>Platform charge %<input type="number" min="0" step="0.01" value={productForm.platformChargePercent} onChange={e=>setProductField('platformChargePercent',e.target.value)}/></label>
                    <label className="wide">Apply existing HOWDI offer<select value={productForm.appliedOfferCode} onChange={e=>setProductField('appliedOfferCode',e.target.value)}><option value="">No campaign linked</option>{coupons.filter(item=>item.active!==false).map(item=><option key={item.id} value={item.code}>{item.code} — {item.campaignName||'HOWDI offer'}</option>)}</select></label>
                  </div>
                  <div className="check-grid">
                    <label className="check"><input type="checkbox" checked={productForm.featured} onChange={e=>setProductField('featured',e.target.checked)}/> Featured</label>
                    <label className="check"><input type="checkbox" checked={productForm.newArrival} onChange={e=>setProductField('newArrival',e.target.checked)}/> New arrival</label>
                    <label className="check"><input type="checkbox" checked={productForm.bestSeller} onChange={e=>setProductField('bestSeller',e.target.checked)}/> Best seller</label>
                    <label className="check"><input type="checkbox" checked={productForm.offerProduct} onChange={e=>setProductField('offerProduct',e.target.checked)}/> Offer product</label>
                  </div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>06</span><div><h3>Inventory, weight & availability</h3><p>Stock is automatically unavailable to customers when quantity reaches zero.</p></div></div>
                  <div className="studio-form-grid">
                    <label>Inventory type<select value={productForm.inventoryType} onChange={e=>setProductField('inventoryType',e.target.value)}><option value="simple">Simple stock</option><option value="variant">Variant stock</option><option value="bulk">Bulk / weight stock</option></select></label>
                    <label>Current stock<input type="number" min="0" step="0.001" value={productForm.stock} onChange={e=>setProductField('stock',e.target.value)} required/></label>
                    <label>Low stock alert<input type="number" min="0" step="0.001" value={productForm.lowStockThreshold} onChange={e=>setProductField('lowStockThreshold',e.target.value)}/></label>
                    <label>Selling unit<select value={productForm.unit} onChange={e=>setProductField('unit',e.target.value)}>{['piece','kg','gram','litre','ml','pack','box','set','bundle','metre','dozen'].map(unit=><option key={unit} value={unit}>{unit}</option>)}</select></label>
                    <label>Net weight<input type="number" min="0" step="0.001" value={productForm.netWeight} onChange={e=>setProductField('netWeight',e.target.value)} placeholder="Number only"/></label>
                  </div>
                  <div className="availability-preview"><strong>{Number(productForm.stock||0)>0?'🟢 In stock':'🔴 Out of stock'}</strong><span>{Number(productForm.stock||0)>0?'Customer can add this product to cart.':'Customer Add to Cart should automatically be disabled.'}</span></div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>07</span><div><h3>Delivery, returns & publishing</h3><p>Product rules sit on top of the platform’s existing location and delivery rules.</p></div></div>
                  <div className="studio-form-grid">
                    <label>Delivery pricing<select value={productForm.deliveryMode} onChange={e=>setProductField('deliveryMode',e.target.value)}><option value="platform">Use platform rules</option><option value="free">Free delivery</option><option value="paid">Seller-defined charge</option><option value="conditional">Free above order value</option></select></label>
                    <label>Delivery charge ₹<input type="number" min="0" step="0.01" value={productForm.deliveryCharge} onChange={e=>setProductField('deliveryCharge',e.target.value)}/></label>
                    <label>Free delivery above ₹<input type="number" min="0" step="0.01" value={productForm.freeDeliveryAbove} onChange={e=>setProductField('freeDeliveryAbove',e.target.value)}/></label>
                    <label>Net weight / shipping weight<input type="number" min="0" step="0.001" value={productForm.netWeight} onChange={e=>setProductField('netWeight',e.target.value)}/></label>
                    <label>Package length<input type="number" min="0" step="0.1" value={productForm.packageLength} onChange={e=>setProductField('packageLength',e.target.value)}/></label>
                    <label>Package width<input type="number" min="0" step="0.1" value={productForm.packageWidth} onChange={e=>setProductField('packageWidth',e.target.value)}/></label>
                    <label>Package height<input type="number" min="0" step="0.1" value={productForm.packageHeight} onChange={e=>setProductField('packageHeight',e.target.value)}/></label>
                    <label>Status<select value={productForm.status} onChange={e=>setProductField('status',e.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label>
                    <label>Return window (days)<input type="number" min="0" value={productForm.returnDays} onChange={e=>setProductField('returnDays',e.target.value)}/></label>
                  </div>
                  <div className="check-grid">
                    <label className="check"><input type="checkbox" checked={productForm.visible} onChange={e=>setProductField('visible',e.target.checked)}/> Visible to customers</label>
                    <label className="check"><input type="checkbox" checked={productForm.returnable} onChange={e=>setProductField('returnable',e.target.checked)}/> Returnable</label>
                    <label className="check"><input type="checkbox" checked={productForm.customizationAvailable} onChange={e=>setProductField('customizationAvailable',e.target.checked)}/> Customisation available</label>
                  </div>
                  {productForm.customizationAvailable&&<label className="wide">Customisation note<textarea rows="3" value={productForm.customizationNote} onChange={e=>setProductField('customizationNote',e.target.value)} placeholder="Customer can choose colour, size, add a name or share a reference image..."/></label>}
                  <div className="publish-bar"><div><strong>Ready to publish?</strong><span>Review media, pricing and stock before saving.</span></div><div><button type="button" onClick={closeProductStudio}>Cancel</button><button className="primary">{editingProduct?'Save product':'Publish product'}</button></div></div>
                </section>
              </form>
            ) : (
              <section className="panel list full">
                <div className="list-head">
                  <div><span className="eyebrow">CATALOGUE PRODUCTS</span><h3>{filteredProducts.length} of {products.length} products</h3></div>
                  <div className="product-list-actions"><input className="search" placeholder="Search product, brand, category..." value={search} onChange={e=>setSearch(e.target.value)}/><button className="primary" onClick={()=>openProductStudio()}>+ Create product</button></div>
                </div>
                {filteredProducts.map(p=><div className="item product-row" key={p.id}>
                  <div className="icon">{p.media?.[0]?.url?<img src={p.media[0].url} alt=""/>:p.icon||'🧶'}</div>
                  <div className="grow"><strong>{p.name}</strong><span>{categoryName(p.categoryId)} · {p.brand||p.subcategory||'—'} · ₹{Number(p.price||p.sellingPrice||0).toLocaleString('en-IN')} · {p.unit||'piece'}</span></div>
                  <span className="stock">{Number(p.stock ?? 0)} {p.unit||'stock'}</span>
                  <span className={Number(p.stock||0)>0?'pill on':'pill off'}>{Number(p.stock||0)>0?'IN STOCK':'OUT OF STOCK'}</span>
                  <span className={p.visible?'pill on':'pill off'}>{p.visible?'VISIBLE':'HIDDEN'}</span>
                  <button onClick={()=>openProductStudio(p)}>Edit</button>
                  <button onClick={()=>toggleProduct(p)}>{p.visible?'Hide':'Show'}</button>
                </div>)}
                {filteredProducts.length===0&&<div className="empty-state">No matching products found. Create your first product from Product Studio.</div>}
              </section>
            )}
          </div>
        )}

        {tab==='variants' && (
          <div className="page">
            <section className="variant-hero"><div><span className="eyebrow">PRODUCT VARIANT ENGINE</span><h2>Price, offer and stock at variant level.</h2><p>Each color/size combination gets its own SKU, regular price, offer price and inventory count.</p></div><div className="variant-hero-stats"><span><b>{variants.length}</b> variants</span><span><b>{variants.filter(v=>Number(v.stock)<=Number(v.lowStockThreshold??5)).length}</b> low stock</span></div></section>
            <section className="variant-workspace">
              <form className="editor panel variant-editor" onSubmit={saveVariant}>
                <div className="panel-head"><div><span className="eyebrow">VARIANT CREATOR</span><h3>{editingVariant?'Edit variant':'Add variant'}</h3></div>{editingVariant&&<span className="reserved">EDITING</span>}</div>
                <label>Product<select value={variantForm.productId} onChange={e=>setVariantForm({...variantForm,productId:e.target.value})} required><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                <div className="variant-two-col"><label>Color<input placeholder="Example: Pink" value={variantForm.color} onChange={e=>setVariantForm({...variantForm,color:e.target.value})}/></label><label>Size<input placeholder="Example: Medium" value={variantForm.size} onChange={e=>setVariantForm({...variantForm,size:e.target.value})}/></label></div>
                <label>Unique SKU<div className="coupon-code-row"><input placeholder="HOWDI-BAG-PINK-M-AB12" value={variantForm.sku} onChange={e=>setVariantForm({...variantForm,sku:e.target.value.toUpperCase()})} required/><button type="button" className="generate-code" onClick={generateVariantSku}>✨ Generate</button></div></label>
                <div className="variant-two-col"><label>Regular price ₹<input type="number" min="1" step="0.01" value={variantForm.regularPrice} onChange={e=>updateVariantRegularPrice(e.target.value)} required/></label><label>Offer price ₹<input type="number" min="0" step="0.01" value={variantForm.offerPrice} onChange={e=>updateVariantOfferPrice(e.target.value)}/></label></div>
                <div className="variant-two-col"><label>Discount %<input type="number" min="0" max="100" step="0.01" value={variantForm.discountPercent} onChange={e=>updateVariantDiscount(e.target.value)}/></label><div className="variant-savings"><span>SAVINGS</span><b>₹{Math.max(0,Number(variantForm.regularPrice||0)-Number(variantForm.offerPrice||variantForm.regularPrice||0)).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></div></div>
                <div className="variant-two-col"><label>Stock quantity<input type="number" min="0" value={variantForm.stock} onChange={e=>setVariantForm({...variantForm,stock:e.target.value})} required/></label><label>Low-stock alert at<input type="number" min="0" value={variantForm.lowStockThreshold} onChange={e=>setVariantForm({...variantForm,lowStockThreshold:e.target.value})}/></label></div>
                <label className="check"><input type="checkbox" checked={variantForm.active} onChange={e=>setVariantForm({...variantForm,active:e.target.checked})}/> Variant active</label>
                <div className="actions"><button className="primary">{editingVariant?'Update variant':'Create variant'}</button>{editingVariant&&<button type="button" onClick={resetVariantForm}>Cancel</button>}</div>
              </form>
              <section className="panel variant-list"><div className="list-head"><div><span className="eyebrow">VARIANT LIBRARY</span><h3>{filteredVariants.length} of {variants.length} variants</h3></div><input className="search" placeholder="Search SKU, product, color, size..." value={variantSearch} onChange={e=>setVariantSearch(e.target.value)}/></div><div className="variant-table">{filteredVariants.map(v=>{const savings=Math.max(0,Number(v.regularPrice||0)-Number(v.offerPrice||v.regularPrice||0));const isLow=Number(v.stock)<=Number(v.lowStockThreshold??5);return <article className="variant-item" key={v.id}><div className="variant-main"><div className="variant-ticket">◈</div><div><strong>{variantProductName(v.productId)}</strong><span>{v.color||'No color'} · {v.size||'No size'} · {v.sku}</span></div></div><div className="variant-price"><b>₹{Number(v.offerPrice||v.regularPrice||0).toLocaleString('en-IN')}</b><span>Regular ₹{Number(v.regularPrice||0).toLocaleString('en-IN')} · Save ₹{savings.toLocaleString('en-IN')}</span></div><div className={isLow?'variant-stock low':'variant-stock'}><b>{v.stock}</b><span>{isLow?'LOW STOCK':'IN STOCK'}</span></div><span className={v.active?'pill on':'pill off'}>{v.active?'ACTIVE':'INACTIVE'}</span><div className="variant-actions"><button onClick={()=>toggleVariant(v)}>{v.active?'Disable':'Activate'}</button><button onClick={()=>editVariant(v)}>Edit</button><button className="danger-button" onClick={()=>deleteVariant(v)}>Delete</button></div></article>})}{filteredVariants.length===0&&<div className="empty-state">◈ {variants.length?'No matching variants found.':'No variants created yet. Add the first product variant.'}</div>}</div></section>
            </section>
          </div>
        )}



        {tab==='inventory' && (
          <div className="page">
            <section className="inventory-hero"><div><span className="eyebrow">INVENTORY CONTROL</span><h2>Every stock change leaves a trail.</h2><p>Record stock in, stock out and exact-count adjustments against the existing variant SKU.</p></div><div className="inventory-hero-stats"><span><b>{inventoryMoves.length}</b> movements</span><span><b>{variants.filter(v=>Number(v.stock||0)<=Number(v.lowStockThreshold??5)).length}</b> low stock</span></div></section>
            <section className="inventory-workspace">
              <form className="editor panel inventory-editor" onSubmit={saveInventoryMove}>
                <div className="panel-head"><div><span className="eyebrow">STOCK MOVEMENT</span><h3>Update inventory</h3></div></div>
                <label>Variant<select value={inventoryForm.variantId} onChange={e=>setInventoryForm({...inventoryForm,variantId:e.target.value})} required><option value="">Select variant SKU</option>{variants.map(v=><option key={v.id} value={v.id}>{inventoryVariantLabel(v)} · Stock {Number(v.stock||0)}</option>)}</select></label>
                <div className="inventory-two-col"><label>Movement<select value={inventoryForm.mode} onChange={e=>setInventoryForm({...inventoryForm,mode:e.target.value})}><option value="in">Stock In (+)</option><option value="out">Stock Out (−)</option><option value="set">Set Exact Stock</option></select></label><label>{inventoryForm.mode==='set'?'New exact stock':'Quantity'}<input type="number" min="0" step="1" placeholder="0" value={inventoryForm.quantity} onChange={e=>setInventoryForm({...inventoryForm,quantity:e.target.value})} required/></label></div>
                <label>Reason<input placeholder="Example: New supplier stock received" value={inventoryForm.reason} onChange={e=>setInventoryForm({...inventoryForm,reason:e.target.value})}/></label>
                <label>Reference / Order ID (optional)<input placeholder="PO-1001 or ORDER-1001" value={inventoryForm.reference} onChange={e=>setInventoryForm({...inventoryForm,reference:e.target.value})}/></label>
                <div className="inventory-note">Orders and returns will later create these movements automatically. For now this is the controlled Admin stock history.</div>
                <div className="actions"><button className="primary">Save stock movement</button></div>
              </form>
              <section className="panel inventory-list"><div className="list-head"><div><span className="eyebrow">MOVEMENT HISTORY</span><h3>{filteredInventoryMoves.length} of {inventoryMoves.length} movements</h3></div><input className="search" placeholder="Search SKU, reason or reference..." value={inventorySearch} onChange={e=>setInventorySearch(e.target.value)}/></div><div className="inventory-table">{filteredInventoryMoves.map(m=>{const sign=m.delta>0?'+' : m.delta<0?'−' : '→';const cls=m.delta>0?'in':m.delta<0?'out':'set';return <article className="inventory-item" key={m.id}><div className="inventory-main"><div className={`inventory-ticket ${cls}`}>{m.mode==='in'?'＋':m.mode==='out'?'−':'↔'}</div><div><strong>{m.sku}</strong><span>{m.productName}{m.color?` · ${m.color}`:''}{m.size?` / ${m.size}`:''}</span></div></div><div className="inventory-change"><b>{m.before} → {m.after}</b><span className={`inventory-delta ${cls}`}>{sign}{Math.abs(Number(m.delta||0))} units</span></div><div className="inventory-reason"><b>{m.reason}</b><span>{m.reference||'No reference'} · {new Date(m.createdAt).toLocaleString('en-IN')}</span></div><span className={`inventory-mode ${cls}`}>{m.mode==='in'?'STOCK IN':m.mode==='out'?'STOCK OUT':'SET STOCK'}</span></article>})}{filteredInventoryMoves.length===0&&<div className="empty-state">📦 {inventoryMoves.length?'No matching inventory movements found.':'No stock movements recorded yet.'}</div>}</div></section>
            </section>
          </div>
        )}

        {tab==='locations' && (
          <div className="page">
            <section className="location-hero"><div><span className="eyebrow">HOWDI DELIVERY ENGINE</span><h2>Pincode serviceability with delivery rules.</h2><p>Control where HOWDI delivers, what customers pay, express availability and estimated delivery days.</p></div><div className="location-hero-stats"><span><b>{locations.filter(l=>l.active!==false && l.serviceable!==false).length}</b> serviceable</span><span><b>{locations.length}</b> total</span></div></section>
            <section className="location-workspace">
              <form className="editor panel location-editor" onSubmit={saveLocation}>
                <div className="panel-head"><div><span className="eyebrow">PINCODE CREATOR</span><h3>{editingLocation?'Edit location':'Add location'}</h3></div>{editingLocation&&<span className="reserved">EDITING</span>}</div>
                <div className="location-two-col"><label>Pincode<input inputMode="numeric" maxLength="6" placeholder="560001" value={locationForm.pincode} onChange={e=>setLocationForm({...locationForm,pincode:e.target.value.replace(/\D/g,'').slice(0,6)})} required/></label><label>City<input placeholder="Bengaluru" value={locationForm.city} onChange={e=>setLocationForm({...locationForm,city:e.target.value})} required/></label></div>
                <div className="location-two-col"><label>State<input placeholder="Karnataka" value={locationForm.state} onChange={e=>setLocationForm({...locationForm,state:e.target.value})} required/></label><label>Country<input value={locationForm.country} onChange={e=>setLocationForm({...locationForm,country:e.target.value})}/></label></div>
                <div className="location-section-title">SERVICEABILITY</div>
                <div className="location-two-col"><label>Estimated minimum days<input type="number" min="0" value={locationForm.estimatedDaysMin} onChange={e=>setLocationForm({...locationForm,estimatedDaysMin:e.target.value})}/></label><label>Estimated maximum days<input type="number" min="0" value={locationForm.estimatedDaysMax} onChange={e=>setLocationForm({...locationForm,estimatedDaysMax:e.target.value})}/></label></div>
                <div className="location-two-col"><label>Standard delivery charge ₹<input type="number" min="0" step="0.01" value={locationForm.standardCharge} onChange={e=>setLocationForm({...locationForm,standardCharge:e.target.value})}/></label><label>Free delivery above ₹<input type="number" min="0" step="0.01" value={locationForm.freeDeliveryAbove} onChange={e=>setLocationForm({...locationForm,freeDeliveryAbove:e.target.value})}/></label></div>
                <label className="check"><input type="checkbox" checked={locationForm.expressAvailable} onChange={e=>setLocationForm({...locationForm,expressAvailable:e.target.checked})}/> Express delivery available</label>
                {locationForm.expressAvailable&&<label>Express delivery charge ₹<input type="number" min="0" step="0.01" value={locationForm.expressCharge} onChange={e=>setLocationForm({...locationForm,expressCharge:e.target.value})}/></label>}
                <label className="check"><input type="checkbox" checked={locationForm.serviceable} onChange={e=>setLocationForm({...locationForm,serviceable:e.target.checked})}/> This pincode is serviceable</label>
                <label className="check"><input type="checkbox" checked={locationForm.active} onChange={e=>setLocationForm({...locationForm,active:e.target.checked})}/> Location rule active</label>
                <div className="actions"><button className="primary">{editingLocation?'Update location':'Create location rule'}</button>{editingLocation&&<button type="button" onClick={resetLocationForm}>Cancel</button>}</div>
              </form>
              <section className="panel location-list"><div className="list-head"><div><span className="eyebrow">SERVICEABILITY LIBRARY</span><h3>{filteredLocations.length} of {locations.length} locations</h3></div><input className="search" placeholder="Search pincode, city or state..." value={locationSearch} onChange={e=>setLocationSearch(e.target.value)}/></div><div className="location-table">{filteredLocations.map(item=>{const enabled=item.active!==false&&item.serviceable!==false;return <article className="location-item" key={item.id}><div className="location-main"><div className="location-ticket">📍</div><div><strong>{item.pincode} · {item.city}</strong><span>{item.state}, {item.country||'India'} · {item.estimatedDaysMin||0}-{item.estimatedDaysMax||0} days</span></div></div><div className="location-summary"><b>₹{Number(item.standardCharge||0).toLocaleString('en-IN')} standard</b><span>Free above ₹{Number(item.freeDeliveryAbove||0).toLocaleString('en-IN')} · {item.expressAvailable?'⚡ Express available':'Standard only'}</span></div><span className={enabled?'pill on':'pill off'}>{enabled?'SERVICEABLE':'NOT AVAILABLE'}</span><div className="location-actions"><button onClick={()=>toggleLocationActive(item)}>{item.active!==false?'Deactivate':'Activate'}</button><button onClick={()=>toggleLocationService(item)}>{item.serviceable!==false?'Disable service':'Enable service'}</button><button onClick={()=>editLocation(item)}>Edit</button><button className="danger-button" onClick={()=>deleteLocation(item)}>Delete</button></div></article>})}{filteredLocations.length===0&&<div className="empty-state">📍 {locations.length?'No matching locations found.':'No pincodes created yet. Add your first delivery location.'}</div>}</div></section>
            </section>
          </div>
        )}

        {tab==='coupons' && (
          <div className="page">
            <section className="coupon-hero"><div><span className="eyebrow">HOWDI PROMO ENGINE</span><h2>Unique codes. Clear rules. Ready for campaigns.</h2><p>Phase A stores coupons safely in this Admin browser while we prepare the backend/database coupon engine.</p></div><div className="coupon-hero-stats"><span><b>{coupons.length}</b> total</span><span><b>{coupons.filter(c=>getCouponStatus(c)==='LIVE').length}</b> live</span></div></section>
            <section className="coupon-workspace">
              <form className="editor panel coupon-editor" onSubmit={saveCoupon}>
                <div className="panel-head"><div><span className="eyebrow">PROMO CREATOR</span><h3>{editingCoupon?'Edit coupon':'Create coupon'}</h3></div>{editingCoupon&&<span className="reserved">EDITING</span>}</div>
                <label>Coupon code<div className="coupon-code-row"><input placeholder="HOWDI10" value={couponForm.code} onChange={e=>setCouponForm({...couponForm,code:e.target.value.toUpperCase()})} required/><button type="button" className="generate-code" onClick={generateCouponCode}>✨ Generate</button></div></label>
                <label>Internal campaign name<input placeholder="Example: Diwali Welcome Campaign" value={couponForm.campaignName} onChange={e=>setCouponForm({...couponForm,campaignName:e.target.value})}/></label>
                <div className="coupon-two-col"><label>Discount type<select value={couponForm.discountType} onChange={e=>setCouponForm({...couponForm,discountType:e.target.value})}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount (₹)</option></select></label><label>Discount value<input type="number" min="1" placeholder="10" value={couponForm.discountValue} onChange={e=>setCouponForm({...couponForm,discountValue:e.target.value})} required/></label></div>
                <div className="coupon-two-col"><label>Minimum order ₹<input type="number" min="0" placeholder="0 = no minimum" value={couponForm.minimumOrderValue} onChange={e=>setCouponForm({...couponForm,minimumOrderValue:e.target.value})}/></label><label>Maximum discount ₹<input type="number" min="0" placeholder="0 = no cap" value={couponForm.maximumDiscount} onChange={e=>setCouponForm({...couponForm,maximumDiscount:e.target.value})}/></label></div>
                <div className="coupon-two-col"><label>Start date & time<input type="datetime-local" value={couponForm.startDate} onChange={e=>setCouponForm({...couponForm,startDate:e.target.value})}/></label><label>End date & time<input type="datetime-local" value={couponForm.endDate} onChange={e=>setCouponForm({...couponForm,endDate:e.target.value})}/></label></div>
                <div className="coupon-two-col"><label>Total usage limit<input type="number" min="0" placeholder="0 = unlimited" value={couponForm.usageLimit} onChange={e=>setCouponForm({...couponForm,usageLimit:e.target.value})}/></label><label>Per customer limit<input type="number" min="1" value={couponForm.perCustomerLimit} onChange={e=>setCouponForm({...couponForm,perCustomerLimit:e.target.value})}/></label></div>
                <label className="check"><input type="checkbox" checked={couponForm.firstOrderOnly} onChange={e=>setCouponForm({...couponForm,firstOrderOnly:e.target.checked})}/> First order customers only</label>
                <label className="check"><input type="checkbox" checked={couponForm.active} onChange={e=>setCouponForm({...couponForm,active:e.target.checked})}/> Coupon active</label>
                <div className="actions"><button className="primary">{editingCoupon?'Update coupon':'Create coupon'}</button>{editingCoupon&&<button type="button" onClick={resetCouponForm}>Cancel</button>}</div>
              </form>
              <section className="panel coupon-list"><div className="list-head coupon-list-head"><div><span className="eyebrow">PROMO LIBRARY</span><h3>{filteredCoupons.length} of {coupons.length} coupons</h3></div><input className="search" placeholder="Search coupon or campaign..." value={couponSearch} onChange={e=>setCouponSearch(e.target.value)}/></div><div className="coupon-table">{filteredCoupons.map(coupon=>{const status=getCouponStatus(coupon);const statusClass=status.toLowerCase().replaceAll(' ','-');return <article className="coupon-item" key={coupon.id}><div className="coupon-main"><div className="coupon-ticket">🎟️</div><div className="coupon-name"><strong>{coupon.code}</strong><span>{coupon.campaignName||'No campaign name'}</span></div></div><div className="coupon-summary"><b>{coupon.discountType==='percentage'?`${coupon.discountValue}% OFF`:`₹${Number(coupon.discountValue).toLocaleString('en-IN')} OFF`}</b><span>Min ₹{Number(coupon.minimumOrderValue||0).toLocaleString('en-IN')} · Limit {coupon.usageLimit||'∞'}</span></div><span className={`coupon-status ${statusClass}`}>{status}</span><div className="coupon-actions"><button onClick={()=>toggleCoupon(coupon)}>{coupon.active?'Pause':'Activate'}</button><button onClick={()=>editCoupon(coupon)}>Edit</button><button className="danger-button" onClick={()=>deleteCoupon(coupon)}>Delete</button></div></article>})}{filteredCoupons.length===0&&<div className="empty-state">🎟️ {coupons.length?'No matching coupons found.':'No coupons created yet. Create your first HOWDI promo code.'}</div>}</div></section>
            </section>
          </div>
        )}

      </main>
    </div>
  );
}

export default AdminApp;
