import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import {
  Search, Plus, MapPin, CalendarDays, PackageSearch, CircleUserRound,
  LogIn, LogOut, Menu, X, ClipboardList, ShieldCheck, ArrowRight,
  ImagePlus, CheckCircle2, AlertCircle, Trash2, Eye, SlidersHorizontal
} from 'lucide-react'
import { STORAGE_KEYS } from './data'
import { apiRequest } from './api'

const SU_LOGO = '/su-logo.png'

const AppContext = createContext(null)
const readStore = (key, fallback) => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch { return fallback }
}
const writeStore = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const dateLabel = (value) => {
  if (!value) return 'ไม่ระบุวันที่'
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function AppProvider({ children }) {
  const [items, setItems] = useState([])
  const [user, setUser] = useState(() => readStore(STORAGE_KEYS.currentUser, null))
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const posts = await apiRequest('/posts?limit=100')
        setItems(posts.map(post => ({
          i_id: String(post.id),
          i_title: post.item_name,
          i_description: post.description,
          i_location: post.location,
          i_date_happened: post.event_date?.slice(0, 10) || '',
          i_type: post.kind,
          i_status: post.status === 'returned'
            ? 'Returned'
            : post.status === 'claimed'
              ? 'Claimed'
              : 'Open',
          i_image_path: post.image_path || '',
          i_owner: post.owner_id === user?.id ? (user.name || user.email) : `ผู้ใช้ ${post.owner_id}`,
          i_owner_id: post.owner_id,
          i_owner_email: post.owner_id === user?.id ? user.email : '',
          createdAt: new Date(post.created_at).getTime(),
        })))
      } catch (error) {
        console.error(error)
      }

      const token = localStorage.getItem('token')
      if (token) {
        try {
          const me = await apiRequest('/auth/me')
          setUser({ id: me.id, name: me.email.split('@')[0], email: me.email })
        } catch {
          localStorage.removeItem('token')
          setUser(null)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => writeStore(STORAGE_KEYS.currentUser, user), [user])
  const value = useMemo(() => ({
    items, setItems, user, setUser, claims, setClaims, loading
  }), [items, user, claims, loading])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
const useApp = () => useContext(AppContext)

function Header() {
  const { user, setUser } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setMenuOpen(false), [location.pathname])
  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
  }
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link to="/" className="brand" aria-label="SU Lost and Found หน้าหลัก">
          <span className="brand-mark logo-mark">
            <img src={SU_LOGO} alt="Silpakorn University Logo" />
          </span>
          <span className="brand-copy">
            <strong>SU Lost & Found</strong>
            <small>Silpakorn University · Sanam Chandra Campus</small>
          </span>
        </Link>
        <button className="mobile-menu" aria-label="เปิดเมนู" onClick={() => setMenuOpen(v => !v)}>
          {menuOpen ? <X/> : <Menu/>}
        </button>
        <nav className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
          <NavLink to="/" end>หน้าหลัก</NavLink>
          {user && <NavLink to="/my-posts">โพสต์ของฉัน</NavLink>}
          <NavLink to="/items/create" className="nav-create"><Plus size={17}/> แจ้งของหาย/ของที่พบ</NavLink>
          {user ? (
            <button className="nav-user" onClick={logout}>
              <CircleUserRound size={17}/>{user.name}<LogOut size={15}/>
            </button>
          ) : (
            <NavLink to="/login" className="nav-login"><LogIn size={17}/> เข้าสู่ระบบ</NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src={SU_LOGO} alt="Silpakorn University Logo" className="footer-logo" />
          <strong>SU Lost & Found</strong>
        </div>
        <span>แพลตฟอร์มแจ้งของหายและของที่พบ</span>
        <span className="footer-note">Silpakorn University · ระบบ Lost & Found</span>
      </div>
    </footer>
  )
}

function Layout({ children }) {
  return <><Header/><main className="main-content">{children}</main><Footer/></>
}

function EmptyState({ title, detail, action }) {
  return <div className="empty-state"><span className="empty-icon"><PackageSearch size={30}/></span><h3>{title}</h3><p>{detail}</p>{action}</div>
}

function ItemCard({ item, onClaim }) {
  const isReturned = item.i_status === 'Returned'
  const isClaimed = item.i_status === 'Claimed'
  return <article className="item-card">
    <div className="item-image-wrap">
      {item.i_image_path ? <img className="item-image" src={item.i_image_path} alt={item.i_title}/> : <div className={`image-placeholder ${item.i_type}`}><PackageSearch size={44}/><span>{item.i_type === 'lost' ? 'LOST ITEM' : 'FOUND ITEM'}</span></div>}
      <span className={`type-pill ${item.i_type}`}>{item.i_type === 'lost' ? 'กำลังตามหา' : 'พบสิ่งของ'}</span>
      {isReturned && <span className="returned-pill"><CheckCircle2 size={13}/> ส่งคืนแล้ว</span>}
      {isClaimed && <span className="claimed-pill"><CheckCircle2 size={13}/> กำลังประสานงาน</span>}
    </div>
    <div className="item-body">
      <div className="item-meta"><span><CalendarDays size={14}/>{dateLabel(item.i_date_happened)}</span><span><MapPin size={14}/>{item.i_location}</span></div>
      <h3>{item.i_title}</h3>
      <p className="item-description">{item.i_description}</p>
      <div className="item-card-bottom">
        <span className="posted-by"><CircleUserRound size={15}/>{item.i_owner || 'ผู้ใช้'}</span>
        {!isReturned && !isClaimed && <button className="button button-outline button-small" onClick={() => onClaim(item)}><Eye size={15}/> {item.i_type === 'lost' ? 'ติดต่อเจ้าของ' : 'ขอรับคืน'}</button>}
        {isClaimed && <span className="status-claimed">กำลังประสานงาน</span>}
        {isReturned && <span className="status-done">ดำเนินการแล้ว</span>}
      </div>
    </div>
  </article>
}

function ClaimDialog({ item, onClose }) {
  const { user, claims, setClaims } = useApp()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const navigate = useNavigate()
  const submit = async (e) => {
    e.preventDefault()
    if (!user) { navigate('/login', { state: { from: '/' } }); return }
    if (message.trim().length < 5) { setError('กรุณาระบุรายละเอียดอย่างน้อย 5 ตัวอักษร'); return }
    setError('')
    try {
      const claim = await apiRequest(`/posts/${item.i_id}/claims`, {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() }),
      })
      setClaims([...claims, {
        id: String(claim.id),
        itemId: String(claim.post_id),
        itemTitle: item.i_title,
        userName: user.name,
        userEmail: user.email,
        message: claim.message,
        status: 'Pending',
        createdAt: new Date(claim.created_at).getTime(),
      }])
      setSent(true)
    } catch (error) {
      setError(error.message)
    }
  }
  if (sent) return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="modal success-modal"><span className="success-icon"><CheckCircle2 size={30}/></span><h2>ส่งคำขอเรียบร้อยแล้ว</h2><p>เจ้าของรายการจะพิจารณาคำขอ เมื่ออนุมัติแล้ว อีเมลติดต่อจะปรากฏในหน้าโพสต์ของฉัน</p><button className="button button-primary full" onClick={onClose}>เรียบร้อย</button></section></div>
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="claim-title">
    <button className="modal-close" onClick={onClose} aria-label="ปิด"><X size={20}/></button>
    <span className="eyebrow">ITEM REQUEST</span><h2 id="claim-title">{item.i_type === 'lost' ? 'ติดต่อเจ้าของสิ่งของ' : 'ขอรับสิ่งของคืน'}</h2><p className="modal-item-name">{item.i_title}</p>
    <form onSubmit={submit} className="form-stack"><label>รายละเอียดเพื่อยืนยัน / ข้อความติดต่อ<textarea rows="4" value={message} onChange={e => {setMessage(e.target.value); setError('')}} placeholder="อธิบายลักษณะเฉพาะของสิ่งของ หรือแจ้งช่องทางติดต่อ..." required maxLength={700}/></label>{error && <p className="field-error">{error}</p>}
      {!user && <p className="form-hint">ต้องเข้าสู่ระบบก่อนส่งคำขอ</p>}
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose}>ยกเลิก</button><button type="submit" className="button button-primary">ส่งคำขอ <ArrowRight size={16}/></button></div>
    </form>
  </section></div>
}

function HomePage() {
  const { items } = useApp()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('open')
  const [claimItem, setClaimItem] = useState(null)
  const filtered = items.filter(item => {
    const searchText = `${item.i_title} ${item.i_description} ${item.i_location}`.toLowerCase()
    return searchText.includes(query.toLowerCase().trim()) &&
      (type === 'all' || item.i_type === type) &&
      (status === 'all' || (status === 'open' ? item.i_status !== 'Returned' : item.i_status === 'Returned'))
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return <>
    <section className="hero">
      <div className="hero-content"><span className="hero-kicker"><span className="live-dot"/> COMMUNITY ITEM BOARD</span>
        <h1>ของหายไม่ต้องกังวล<br/><span>เราช่วยคุณตามหา</span></h1>
        <p>พื้นที่กลางสำหรับแจ้งของหายและแบ่งปันสิ่งของที่พบ<br className="desktop-break"/> ภายในมหาวิทยาลัยศิลปากร วิทยาเขตพระราชวังสนามจันทร์</p>
        <div className="hero-actions"><Link to="/items/create" className="button button-light"><Plus size={18}/> แจ้งรายการใหม่</Link><a href="#items" className="button button-hero-outline">ค้นหารายการ <ArrowRight size={17}/></a></div>
        <div className="hero-stats"><div><strong>{items.length}</strong><span>รายการทั้งหมด</span></div><div><strong>{items.filter(i => i.i_status !== 'Returned').length}</strong><span>ยังตามหาอยู่</span></div><div><strong>{items.filter(i => i.i_status === 'Returned').length}</strong><span>ส่งคืนแล้ว</span></div></div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="art-ring ring-one"/>
        <div className="art-ring ring-two"/>
        <div className="art-card art-card-back"><span className="art-icon">✓</span><span className="art-line long"/><span className="art-line short"/></div>
        <div className="art-card art-card-front"><div className="art-pin"><MapPin size={34}/></div><span className="art-line long"/><span className="art-line medium"/><span className="art-line short"/></div>
        <div className="art-float float-one"><CheckCircle2 size={18}/></div>
        <div className="art-float float-two"><Search size={18}/></div>
      </div>
    </section>
    <section className="content-section" id="items">
      <div className="section-heading"><div><span className="eyebrow">FIND YOUR ITEM</span><h2>รายการล่าสุด</h2><p>ค้นหาจากชื่อสิ่งของ รายละเอียด หรือสถานที่</p></div><span className="result-count">{filtered.length} รายการ</span></div>
      <div className="filter-panel"><div className="search-box"><Search size={19}/><input aria-label="ค้นหารายการ" value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาสิ่งของหรือสถานที่..."/>{query && <button aria-label="ล้างการค้นหา" onClick={() => setQuery('')}><X size={16}/></button>}</div>
        <div className="filter-select"><SlidersHorizontal size={17}/><select aria-label="ประเภท" value={type} onChange={e => setType(e.target.value)}><option value="all">ทุกประเภท</option><option value="lost">ของหาย</option><option value="found">ของที่พบ</option></select></div>
        <div className="filter-select"><select aria-label="สถานะ" value={status} onChange={e => setStatus(e.target.value)}><option value="open">ยังดำเนินการ</option><option value="returned">ส่งคืนแล้ว</option><option value="all">ทุกสถานะ</option></select></div>
      </div>
      {filtered.length ? <div className="items-grid">{filtered.map(item => <ItemCard key={item.i_id} item={item} onClaim={setClaimItem}/>)}</div> : <EmptyState title="ไม่พบรายการที่ค้นหา" detail="ลองเปลี่ยนคำค้นหาหรือตัวกรอง หรือสร้างรายการใหม่ได้เลย" action={<Link to="/items/create" className="button button-primary"><Plus size={17}/> แจ้งรายการใหม่</Link>}/>}
    </section>
    <section className="how-section"><div className="section-heading centered"><div><span className="eyebrow">HOW IT WORKS</span><h2>ใช้งานง่ายใน 3 ขั้นตอน</h2><p>ช่วยกันส่งต่อสิ่งของกลับไปหาเจ้าของ</p></div></div><div className="steps-grid"><div className="step-card"><span className="step-number">01</span><span className="step-icon"><ClipboardList size={24}/></span><h3>แจ้งรายการ</h3><p>ระบุชื่อ รายละเอียด สถานที่ วันที่ และภาพของสิ่งของ</p></div><div className="step-card"><span className="step-number">02</span><span className="step-icon"><Search size={24}/></span><h3>ค้นหาและตรวจสอบ</h3><p>ค้นหารายการที่ตรงกันและตรวจสอบข้อมูลก่อนติดต่อ</p></div><div className="step-card"><span className="step-number">03</span><span className="step-icon"><ShieldCheck size={24}/></span><h3>ติดต่อเพื่อรับคืน</h3><p>ส่งข้อความยืนยันข้อมูลเพื่อประสานงานกับผู้โพสต์</p></div></div></section>
    {claimItem && <ClaimDialog item={claimItem} onClose={() => setClaimItem(null)}/>}
  </>
}

function CreatePage() {
  const { user, items, setItems } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({ i_title: '', i_description: '', i_location: '', i_date_happened: new Date().toISOString().slice(0,10), i_type: 'found' })
  const [image, setImage] = useState('')
  const [imageName, setImageName] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })
  const chooseImage = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('กรุณาเลือกไฟล์รูปภาพ'); return }
    if (file.size > 1_500_000) { setError('รูปภาพต้องมีขนาดไม่เกิน 1.5 MB'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => { setImage(String(reader.result)); setImageName(file.name); setError('') }
    reader.onerror = () => setError('อ่านไฟล์รูปภาพไม่สำเร็จ')
    reader.readAsDataURL(file)
  }
  const submit = async e => {
    e.preventDefault()
    if (!user) { navigate('/login', { state: { from: '/items/create' } }); return }
    if (form.i_title.trim().length < 2 || form.i_description.trim().length < 5 || form.i_location.trim().length < 2) { setError('กรุณาตรวจสอบชื่อ รายละเอียด และสถานที่'); return }
    setBusy(true); setError('')
    try {
      const post = await apiRequest('/posts', {
        method: 'POST',
        body: JSON.stringify({
          kind: form.i_type,
          item_name: form.i_title.trim(),
          description: form.i_description.trim(),
          location: form.i_location.trim(),
          event_date: form.i_date_happened || null,
        }),
      })
      let uploadedPost = post
      if (imageFile) {
        const formData = new FormData()
        formData.append('image', imageFile)
        uploadedPost = await apiRequest(`/posts/${post.id}/image`, {
          method: 'POST',
          body: formData,
        })
      }
      const item = {
        i_id: String(uploadedPost.id),
        i_title: uploadedPost.item_name,
        i_description: uploadedPost.description,
        i_location: uploadedPost.location,
        i_date_happened: uploadedPost.event_date?.slice(0, 10) || '',
        i_type: uploadedPost.kind,
        i_status: 'Open',
        i_image_path: uploadedPost.image_path || image,
        i_owner: user.name,
        i_owner_id: uploadedPost.owner_id,
        i_owner_email: user.email,
        createdAt: new Date(post.created_at).getTime(),
      }
      setItems([item, ...items])
      navigate('/my-posts', { state: { notice: 'สร้างรายการสำเร็จแล้ว' } })
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  return <section className="form-page"><div className="form-page-intro"><Link to="/" className="back-link">← กลับหน้าหลัก</Link><span className="eyebrow">CREATE A LISTING</span><h1>แจ้งของหาย / ของที่พบ</h1><p>กรอกรายละเอียดให้ชัดเจน เพื่อช่วยให้เจ้าของและผู้พบติดต่อกันได้ง่ายขึ้น</p></div>
    {!user && <div className="notice-banner"><AlertCircle size={19}/><span>คุณสามารถกรอกข้อมูลได้ แต่ต้อง <Link to="/login">เข้าสู่ระบบ</Link> ก่อนบันทึกรายการ</span></div>}
    <form className="listing-form" onSubmit={submit}>
      <div className="form-section-title"><span>01</span><div><h2>ข้อมูลสิ่งของ</h2><p>รายละเอียดพื้นฐานของรายการ</p></div></div>
      <div className="field"><label>ประเภทของรายการ <span className="required">*</span></label><div className="type-choice"><button type="button" className={form.i_type === 'lost' ? 'choice active' : 'choice'} onClick={() => setForm({...form, i_type: 'lost'})}><span className="choice-icon lost"><Search size={20}/></span><span><strong>ของหาย</strong><small>ฉันกำลังตามหาสิ่งของ</small></span>{form.i_type === 'lost' && <CheckCircle2 className="choice-check" size={18}/>}</button><button type="button" className={form.i_type === 'found' ? 'choice active' : 'choice'} onClick={() => setForm({...form, i_type: 'found'})}><span className="choice-icon found"><PackageSearch size={20}/></span><span><strong>ของที่พบ</strong><small>ฉันพบสิ่งของของผู้อื่น</small></span>{form.i_type === 'found' && <CheckCircle2 className="choice-check" size={18}/>}</button></div></div>
      <div className="field"><label htmlFor="title">ชื่อสิ่งของ <span className="required">*</span></label><input id="title" name="i_title" value={form.i_title} onChange={change} placeholder="เช่น กระเป๋าสตางค์สีดำ, กุญแจรถ" required minLength={2} maxLength={100}/></div>
      <div className="field"><label htmlFor="description">รายละเอียด <span className="required">*</span></label><textarea id="description" name="i_description" value={form.i_description} onChange={change} placeholder="บอกลักษณะ สี ยี่ห้อ หรือจุดสังเกตของสิ่งของ" rows={4} required minLength={5} maxLength={1000}/><span className="field-foot">{form.i_description.length}/1000 ตัวอักษร</span></div>
      <div className="field-row"><div className="field"><label htmlFor="location">สถานที่ <span className="required">*</span></label><div className="input-icon"><MapPin size={18}/><input id="location" name="i_location" value={form.i_location} onChange={change} placeholder="เช่น อาคาร 15 ห้อง 301" required maxLength={150}/></div></div><div className="field"><label htmlFor="date">วันที่เกิดเหตุ <span className="required">*</span></label><div className="input-icon"><CalendarDays size={18}/><input id="date" type="date" name="i_date_happened" value={form.i_date_happened} onChange={change} required max={new Date().toISOString().slice(0,10)}/></div></div></div>
      <div className="form-section-title second"><span>02</span><div><h2>รูปภาพประกอบ</h2><p>เพิ่มรูปภาพเพื่อช่วยยืนยันลักษณะของสิ่งของ (ไม่บังคับ)</p></div></div>
      <label className="upload-area"><input type="file" accept="image/*" onChange={chooseImage}/>{image ? <><img className="upload-preview" src={image} alt="รูปภาพที่เลือก"/><span className="upload-text"><strong>{imageName}</strong><small>คลิกเพื่อเปลี่ยนรูปภาพ</small></span></> : <><span className="upload-icon"><ImagePlus size={25}/></span><span className="upload-text"><strong>คลิกเพื่อเลือกรูปภาพ</strong><small>PNG, JPG หรือ WEBP · ไม่เกิน 1.5 MB</small></span></>}<span className="upload-action">เลือกรูป</span></label>
      {error && <p className="field-error"><AlertCircle size={16}/>{error}</p>}
      <div className="privacy-note"><ShieldCheck size={19}/><p>กรุณาอย่าใส่ข้อมูลส่วนตัวที่ละเอียดอ่อน เช่น เลขบัตรประชาชน หรือข้อมูลทางการเงิน ลงในรายละเอียดสาธารณะ</p></div>
      <div className="form-submit-row"><Link to="/" className="button button-ghost">ยกเลิก</Link><button className="button button-primary" disabled={busy} type="submit">{busy ? 'กำลังบันทึก...' : 'เผยแพร่รายการ'} <ArrowRight size={17}/></button></div>
    </form>
  </section>
}

function AuthPage({ mode }) {
  const { setUser } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isRegister = mode === 'register'
  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true)
    const cleanEmail = email.trim().toLowerCase()
    if (password.length < (isRegister ? 8 : 1)) {
      setError(isRegister ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' : 'กรุณากรอกรหัสผ่าน')
      setBusy(false)
      return
    }
    try {
      if (isRegister) {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, password }),
        })
      }
      const token = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password }),
      })
      localStorage.setItem('token', token.access_token)
      const me = await apiRequest('/auth/me')
      setUser({
        id: me.id,
        name: name.trim() || me.email.split('@')[0],
        email: me.email,
      })
      navigate(location.state?.from || '/', { replace: true })
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy(false)
    }
  }
  return <section className="auth-page">
    <div className="auth-visual">
      <div className="auth-visual-content">
        <span className="auth-emblem logo-emblem">
          <img src={SU_LOGO} alt="Silpakorn University Logo" />
        </span>
        <span className="eyebrow">SILPAKORN UNIVERSITY</span>
        <h1>สิ่งของอาจหายไป<br/>แต่โอกาสได้คืนยังมี</h1>
        <p>ช่วยกันประกาศ ค้นหา และส่งต่อสิ่งของกลับคืนสู่เจ้าของ</p>
        <div className="auth-visual-tag"><ShieldCheck size={17}/> ชุมชนที่ช่วยเหลือกัน</div>
      </div>
      <div className="auth-decoration auth-decoration-one"/>
      <div className="auth-decoration auth-decoration-two"/>
    </div>
    <div className="auth-form-side">
      <form className="auth-form" onSubmit={submit}>
        <span className="eyebrow">{isRegister ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</span>
        <h2>{isRegister ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับมา'}</h2>
        <p>{isRegister ? 'สมัครเพื่อเริ่มแจ้งรายการและติดต่อผู้โพสต์' : 'เข้าสู่ระบบเพื่อจัดการรายการของคุณ'}</p>
        {isRegister && <div className="field"><label htmlFor="name">ชื่อที่แสดง</label><input id="name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" required minLength={2} placeholder="ชื่อของคุณ"/></div>}
        <div className="field"><label htmlFor="email">อีเมล</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com"/></div>
        <div className="field"><label htmlFor="password">รหัสผ่าน</label><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 8 : 1} placeholder={isRegister ? 'อย่างน้อย 8 ตัวอักษร' : 'กรอกรหัสผ่าน'}/></div>
        {error && <p className="field-error"><AlertCircle size={16}/>{error}</p>}
        <button className="button button-primary full auth-submit" disabled={busy} type="submit">{busy ? 'กำลังดำเนินการ...' : isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'} <ArrowRight size={17}/></button>
        <p className="auth-switch">{isRegister ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชี?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</Link></p>
        <p className="account-info-note"><ShieldCheck size={15}/> ข้อมูลบัญชีถูกจัดเก็บและตรวจสอบผ่านระบบ Backend</p>
      </form>
    </div>
  </section>
}

function MyPostsPage() {
  const { user, items, setItems, claims, setClaims } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [notice, setNotice] = useState(location.state?.notice || '')
  const [receivedClaims, setReceivedClaims] = useState([])
  const [sentClaimsError, setSentClaimsError] = useState('')
  const [receivedClaimsError, setReceivedClaimsError] = useState('')
  const [reviewError, setReviewError] = useState('')
  const mine = user ? items.filter(i => i.i_owner_id === user.id) : []

  useEffect(() => { if (location.state?.notice) navigate(location.pathname, { replace: true, state: {} }) }, [])
  useEffect(() => {
    if (!user) return
    let active = true
    const loadClaims = async () => {
      try {
        const mine = await apiRequest('/claims/me')
        const mapped = mine.map(claim => {
          const post = items.find(item => item.i_id === String(claim.post_id))
          return {
            id: String(claim.id),
            itemId: String(claim.post_id),
            itemTitle: post?.i_title || `รายการ #${claim.post_id}`,
            userName: user.name,
            userEmail: user.email,
            message: claim.message,
            status: claim.status,
            ownerEmail: claim.owner_email,
            createdAt: new Date(claim.created_at).getTime(),
          }
        })
        if (active) {
          setClaims(mapped)
          setSentClaimsError('')
        }
      } catch (error) {
        if (active) setSentClaimsError(error.message)
      }
    }
    loadClaims()
    return () => { active = false }
  }, [user, items])

  useEffect(() => {
    if (!user || mine.length === 0) {
      setReceivedClaims([])
      setReceivedClaimsError('')
      return
    }

    let active = true
    const loadReceivedClaims = async () => {
      try {
        const byPost = await Promise.all(mine.map(async post => {
          const postClaims = await apiRequest(`/posts/${post.i_id}/claims`)
          return postClaims.map(claim => ({
            id: String(claim.id),
            postId: String(claim.post_id),
            postTitle: post.i_title,
            requesterEmail: claim.requester_email,
            message: claim.message,
            status: claim.status,
            createdAt: new Date(claim.created_at).getTime(),
          }))
        }))
        if (active) {
          setReceivedClaims(byPost.flat())
          setReceivedClaimsError('')
        }
      } catch (error) {
        if (active) setReceivedClaimsError(error.message)
      }
    }
    loadReceivedClaims()
    return () => { active = false }
  }, [user, items])

  if (!user) return <EmptyState title="กรุณาเข้าสู่ระบบ" detail="เข้าสู่ระบบเพื่อดูรายการที่คุณสร้างและคำขอที่เกี่ยวข้อง" action={<Link to="/login" className="button button-primary">เข้าสู่ระบบ</Link>}/>
  const myClaims = claims.filter(c => c.userEmail === user.email)
  const removeItem = async id => {
    if (!window.confirm('ต้องการลบรายการนี้หรือไม่?')) return
    try {
      await apiRequest(`/posts/${id}`, { method: 'DELETE' })
      setItems(items.filter(i => i.i_id !== id))
    } catch (error) {
      window.alert(error.message)
    }
  }
  const markReturned = async id => {
    const item = items.find(i => i.i_id === id)
    if (!item) return
    const nextStatus = item.i_status === 'Returned' ? 'open' : 'returned'
    try {
      await apiRequest(`/posts/${id}/status?status_value=${nextStatus}`, { method: 'PATCH' })
      setItems(items.map(i => i.i_id === id ? {...i, i_status: nextStatus === 'returned' ? 'Returned' : 'Open'} : i))
    } catch (error) {
      window.alert(error.message)
    }
  }
  const reviewClaim = async (claim, decision) => {
    setReviewError('')
    try {
      const updated = await apiRequest(
        `/posts/${claim.postId}/claims/${claim.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: decision }),
        },
      )
      setReceivedClaims(current => current.map(existing => {
        if (existing.postId !== claim.postId) return existing
        if (existing.id === claim.id) {
          return { ...existing, status: updated.status }
        }
        if (decision === 'approved' && existing.status === 'pending') {
          return { ...existing, status: 'rejected' }
        }
        return existing
      }))
      if (decision === 'approved') {
        setItems(current => current.map(item => item.i_id === claim.postId
          ? { ...item, i_status: 'Claimed' }
          : item))
      }
    } catch (error) {
      setReviewError(error.message)
    }
  }
  return <section className="my-page"><div className="section-heading"><div><span className="eyebrow">YOUR DASHBOARD</span><h1>โพสต์ของฉัน</h1><p>จัดการรายการและติดตามคำขอรับสิ่งของ</p></div><Link to="/items/create" className="button button-primary"><Plus size={17}/> สร้างรายการ</Link></div>
    {notice && <div className="success-banner"><CheckCircle2 size={18}/>{notice}<button onClick={() => setNotice('')}><X size={16}/></button></div>}
    <div className="dashboard-columns"><section className="dashboard-panel"><div className="panel-heading"><h2>รายการที่ฉันโพสต์</h2><span>{mine.length}</span></div>
      {mine.length ? <div className="my-list">{mine.map(item => (
        <div className="my-item" key={item.i_id}>
          <div className="my-item-thumb">
            {item.i_image_path
              ? <img src={item.i_image_path} alt={item.i_title}/>
              : <PackageSearch size={22}/>}
          </div>
          <div className="my-item-info">
            <strong>{item.i_title}</strong>
            <span>{item.i_type === 'lost' ? 'ของหาย' : 'ของที่พบ'} · {dateLabel(item.i_date_happened)}</span>
            <span className={item.i_status === 'Returned' ? 'status-done' : item.i_status === 'Claimed' ? 'status-claimed' : 'status-open'}>
              {item.i_status === 'Returned' ? 'ส่งคืนแล้ว' : item.i_status === 'Claimed' ? 'กำลังประสานงาน' : 'กำลังดำเนินการ'}
            </span>
          </div>
          <div className="my-item-actions">
            <button title={item.i_status === 'Returned' ? 'เปลี่ยนเป็นกำลังดำเนินการ' : 'ทำเครื่องหมายว่าส่งคืนแล้ว'} onClick={() => markReturned(item.i_id)}><CheckCircle2 size={17}/></button>
            <button title="ลบรายการ" className="danger-icon" onClick={() => removeItem(item.i_id)}><Trash2 size={17}/></button>
          </div>
        </div>
      ))}</div> : <EmptyState title="ยังไม่มีรายการ" detail="รายการที่คุณสร้างจะปรากฏตรงนี้" action={<Link to="/items/create" className="button button-primary"><Plus size={16}/> สร้างรายการแรก</Link>}/>}
    </section>
    <section className="dashboard-panel">
      <div className="panel-heading"><h2>คำขอที่ฉันส่ง</h2><span>{myClaims.length}</span></div>
      {sentClaimsError && <p className="field-error claim-error">{sentClaimsError}</p>}
      {myClaims.length ? <div className="my-list">{myClaims.map(c => (
        <div className="claim-row" key={c.id}>
          <span className="claim-symbol"><ClipboardList size={19}/></span>
          <div className="my-item-info">
            <strong>{c.itemTitle}</strong>
            {c.message && <span>{c.message}</span>}
            <span className={c.status === 'approved' ? 'status-done' : c.status === 'rejected' ? 'status-rejected' : 'status-open'}>
              {c.status === 'approved' ? 'เจ้าของอนุมัติคำขอ' : c.status === 'rejected' ? 'คำขอถูกปฏิเสธ' : 'รอเจ้าของพิจารณา'}
            </span>
            {c.status === 'approved' && c.ownerEmail && (
              <a className="button button-outline button-small claim-contact" href={`mailto:${c.ownerEmail}`}>
                ติดต่อเจ้าของทางอีเมล · {c.ownerEmail}
              </a>
            )}
          </div>
        </div>
      ))}</div> : <EmptyState title="ยังไม่มีคำขอ" detail="คำขอรับสิ่งของที่คุณส่งจะปรากฏตรงนี้"/>}
    </section>
    <section className="dashboard-panel">
      <div className="panel-heading"><h2>คำขอที่ได้รับ</h2><span>{receivedClaims.length}</span></div>
      {receivedClaimsError && <p className="field-error claim-error">{receivedClaimsError}</p>}
      {reviewError && <p className="field-error claim-error">{reviewError}</p>}
      {receivedClaims.length ? <div className="my-list">{receivedClaims.map(claim => (
        <div className="claim-row" key={claim.id}>
          <span className="claim-symbol"><ClipboardList size={19}/></span>
          <div className="my-item-info">
            <strong>{claim.postTitle}</strong>
            {claim.message && <span>{claim.message}</span>}
            <span className={claim.status === 'approved' ? 'status-done' : claim.status === 'rejected' ? 'status-rejected' : 'status-open'}>
              {claim.status === 'approved' ? 'อนุมัติแล้ว' : claim.status === 'rejected' ? 'ปฏิเสธแล้ว' : 'รอพิจารณา'}
            </span>
            {claim.requesterEmail && <a className="claim-email" href={`mailto:${claim.requesterEmail}`}>{claim.requesterEmail}</a>}
            {claim.status === 'pending' && (
              <div className="claim-actions">
                <button className="button button-primary button-small" onClick={() => reviewClaim(claim, 'approved')}>อนุมัติ</button>
                <button className="button button-ghost button-small" onClick={() => reviewClaim(claim, 'rejected')}>ปฏิเสธ</button>
              </div>
            )}
          </div>
        </div>
      ))}</div> : <EmptyState title="ยังไม่มีคำขอที่ได้รับ" detail="เมื่อมีผู้ส่งคำขอเกี่ยวกับโพสต์ของคุณ คำขอจะแสดงที่นี่"/>}
    </section></div>
    <div className="backend-info-note"><ShieldCheck size={17}/><span>รายการและคำขอของคุณเชื่อมกับฐานข้อมูลกลางผ่านระบบ Backend</span></div>
  </section>
}

function NotFoundPage() {
  return <EmptyState title="ไม่พบหน้าที่ต้องการ" detail="ลิงก์นี้อาจไม่ถูกต้องหรือหน้านี้ไม่มีอยู่แล้ว" action={<Link to="/" className="button button-primary">กลับหน้าหลัก</Link>}/>
}

function App() {
  return <AppProvider><Layout><Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/items/create" element={<CreatePage/>}/>
    <Route path="/login" element={<AuthPage mode="login"/>}/>
    <Route path="/register" element={<AuthPage mode="register"/>}/>
    <Route path="/my-posts" element={<MyPostsPage/>}/>
    <Route path="*" element={<NotFoundPage/>}/>
  </Routes></Layout></AppProvider>
}
export default App