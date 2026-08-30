import { useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:5000';

function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem('howdiAdminToken') || '');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('HOWDI@2026');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [notice, setNotice] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name:'', icon:'🧶', description:'', visible:true, showOnHome:true });
  const [subcategoryForm, setSubcategoryForm] = useState({ categoryId:'', name:'', icon:'🧶', visible:true });
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);

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
      setCategories(c.categories || []); setSubcategories(s.subcategories || []); setProducts(p.products || []);
    } catch (e) { setNotice(e.message); }
  }

  useEffect(() => { if (token) loadAll(); }, [token]);

  async function login(e) {
    e.preventDefault(); setLoginError('');
    try {
      const response = await fetch(`${API}/api/admin/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Invalid admin credentials');
      localStorage.setItem('howdiAdminToken', data.token); setToken(data.token);
    } catch (e) { setLoginError(e.message); }
  }

  async function saveCategory(e) {
    e.preventDefault(); setNotice('');
    try {
      const path = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const data = await api(path, { method: editingCategory ? 'PUT':'POST', body:JSON.stringify(categoryForm) });
      setCategories(items => editingCategory ? items.map(x => x.id===data.category.id ? data.category : x) : [...items, data.category]);
      setCategoryForm({name:'',icon:'🧶',description:'',visible:true,showOnHome:true}); setEditingCategory(null); setNotice('Category saved.');
    } catch(e) { setNotice(e.message); }
  }

  async function saveSubcategory(e) {
    e.preventDefault(); setNotice('');
    try {
      const path = editingSubcategory ? `/api/admin/subcategories/${editingSubcategory.id}` : '/api/admin/subcategories';
      const data = await api(path, { method: editingSubcategory ? 'PUT':'POST', body:JSON.stringify(subcategoryForm) });
      setSubcategories(items => editingSubcategory ? items.map(x => x.id===data.subcategory.id ? data.subcategory : x) : [...items, data.subcategory]);
      setSubcategoryForm({categoryId:categories[0]?.id||'',name:'',icon:'🧶',visible:true}); setEditingSubcategory(null); setNotice('Subcategory saved.');
    } catch(e) { setNotice(e.message); }
  }

  async function toggleCategory(item) {
    try { const data=await api(`/api/admin/categories/${item.id}`,{method:'PUT',body:JSON.stringify({visible:!item.visible})}); setCategories(xs=>xs.map(x=>x.id===item.id?data.category:x)); setNotice(`${item.name} is now ${data.category.visible?'visible':'hidden'}.`); } catch(e){setNotice(e.message)}
  }
  async function toggleSubcategory(item) {
    try { const data=await api(`/api/admin/subcategories/${item.id}`,{method:'PUT',body:JSON.stringify({visible:!item.visible})}); setSubcategories(xs=>xs.map(x=>x.id===item.id?data.subcategory:x)); setNotice(`${item.name} is now ${data.subcategory.visible?'visible':'hidden'}.`); } catch(e){setNotice(e.message)}
  }
  async function toggleProduct(item) {
    try { const data=await api(`/api/admin/products/${item.id}`,{method:'PUT',body:JSON.stringify({visible:!item.visible})}); setProducts(xs=>xs.map(x=>x.id===item.id?data.product:x)); setNotice(`${item.name} is now ${data.product.visible?'visible':'hidden'}.`); } catch(e){setNotice(e.message)}
  }

  if (!token) return <div className="login-page"><form className="login-card" onSubmit={login}><div className="eyebrow">HOWDI ADMIN</div><h1>Catalogue control 🧶</h1><p>Manage Grandma's handmade catalogue from one place.</p><label>Username<input value={username} onChange={e=>setUsername(e.target.value)} /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>{loginError&&<div className="error">{loginError}</div>}<button className="primary">Sign in</button></form></div>;

  const categoryName = id => categories.find(c=>String(c.id)===String(id))?.name || '—';

  return <div className="app">
    <aside><div className="brand">🧶 <span>HOWDI</span><small>ADMIN</small></div><div className="tagline">Grandma-made catalogue</div><nav>{[['categories','📂 Categories'],['subcategories','🧵 Subcategories'],['products','🛍️ Products']].map(([id,label])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}</nav><button className="logout" onClick={()=>{localStorage.removeItem('howdiAdminToken');setToken('')}}>Sign out</button></aside>
    <main><header><div><div className="eyebrow">CATALOGUE CONTROL</div><h1>{tab==='categories'?'Categories':tab==='subcategories'?'Subcategories':'Products'}</h1><p>Only approved, visible handmade catalogue data reaches customers.</p></div><button className="refresh" onClick={loadAll}>↻ Refresh</button></header>
      {notice&&<div className="notice">{notice}</div>}
      {tab==='categories'&&<section className="workspace"><form className="editor" onSubmit={saveCategory}><h2>{editingCategory?'Edit category':'Create category'}</h2><input placeholder="Category name" value={categoryForm.name} onChange={e=>setCategoryForm({...categoryForm,name:e.target.value})} required/><div className="row"><input placeholder="Icon" value={categoryForm.icon} onChange={e=>setCategoryForm({...categoryForm,icon:e.target.value})}/><input placeholder="Description" value={categoryForm.description} onChange={e=>setCategoryForm({...categoryForm,description:e.target.value})}/></div><label className="check"><input type="checkbox" checked={categoryForm.visible} onChange={e=>setCategoryForm({...categoryForm,visible:e.target.checked})}/> Visible to customers</label><label className="check"><input type="checkbox" checked={categoryForm.showOnHome} onChange={e=>setCategoryForm({...categoryForm,showOnHome:e.target.checked})}/> Show on homepage</label><div className="actions"><button className="primary">{editingCategory?'Update':'Add category'}</button>{editingCategory&&<button type="button" onClick={()=>{setEditingCategory(null);setCategoryForm({name:'',icon:'🧶',description:'',visible:true,showOnHome:true})}}>Cancel</button>}</div></form><div className="list"><div className="list-title">{categories.length} categories</div>{categories.map(c=><div className="item" key={c.id}><div className="icon">{c.icon}</div><div className="grow"><strong>{c.name}</strong><span>{c.description||'No description'}</span></div><span className={c.visible?'pill on':'pill off'}>{c.visible?'VISIBLE':'HIDDEN'}</span><button onClick={()=>toggleCategory(c)}>{c.visible?'Hide':'Show'}</button><button onClick={()=>{setEditingCategory(c);setCategoryForm({name:c.name,icon:c.icon||'🧶',description:c.description||'',visible:c.visible!==false,showOnHome:c.showOnHome!==false})}}>Edit</button></div>)}</div></section>}
      {tab==='subcategories'&&<section className="workspace"><form className="editor" onSubmit={saveSubcategory}><h2>{editingSubcategory?'Edit subcategory':'Create subcategory'}</h2><select value={subcategoryForm.categoryId} onChange={e=>setSubcategoryForm({...subcategoryForm,categoryId:e.target.value})} required><option value="">Select parent category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select><div className="row"><input placeholder="Subcategory name" value={subcategoryForm.name} onChange={e=>setSubcategoryForm({...subcategoryForm,name:e.target.value})} required/><input placeholder="Icon" value={subcategoryForm.icon} onChange={e=>setSubcategoryForm({...subcategoryForm,icon:e.target.value})}/></div><label className="check"><input type="checkbox" checked={subcategoryForm.visible} onChange={e=>setSubcategoryForm({...subcategoryForm,visible:e.target.checked})}/> Visible to customers</label><div className="actions"><button className="primary">{editingSubcategory?'Update':'Add subcategory'}</button>{editingSubcategory&&<button type="button" onClick={()=>{setEditingSubcategory(null);setSubcategoryForm({categoryId:categories[0]?.id||'',name:'',icon:'🧶',visible:true})}}>Cancel</button>}</div></form><div className="list"><div className="list-title">{subcategories.length} subcategories</div>{subcategories.map(s=><div className="item" key={s.id}><div className="icon">{s.icon}</div><div className="grow"><strong>{s.name}</strong><span>{categoryName(s.categoryId)}</span></div><span className={s.visible?'pill on':'pill off'}>{s.visible?'VISIBLE':'HIDDEN'}</span><button onClick={()=>toggleSubcategory(s)}>{s.visible?'Hide':'Show'}</button><button onClick={()=>{setEditingSubcategory(s);setSubcategoryForm({categoryId:s.categoryId,name:s.name,icon:s.icon||'🧶',visible:s.visible!==false})}}>Edit</button></div>)}</div></section>}
      {tab==='products'&&<section className="list full"><div className="list-title">{products.length} catalogue products</div>{products.map(p=><div className="item" key={p.id}><div className="icon">{p.icon||'🧶'}</div><div className="grow"><strong>{p.name}</strong><span>{categoryName(p.categoryId)} · {p.subcategory||'—'} · ₹{Number(p.price||0).toLocaleString('en-IN')}</span></div><span className={p.visible?'pill on':'pill off'}>{p.visible?'VISIBLE':'HIDDEN'}</span><button onClick={()=>toggleProduct(p)}>{p.visible?'Hide':'Show'}</button></div>)}</section>}
    </main>
  </div>
}
export default AdminApp;
