import React, {useState} from 'react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard(){
  const token = localStorage.getItem('token')
  const nav = useNavigate()
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [uploading, setUploading] = useState(false)

  if (!token) {
    // not logged in
    nav('/login')
    return null
  }

  const doLogout = () => { localStorage.removeItem('token'); nav('/login') }

  const onFileChange = async (e) => {
    setErr(''); setMsg('')
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const text = await f.text()
    setUploading(true)
    try {
      const res = await fetch('http://localhost:8080/upload-stub', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: f.name, csv_text: text })
      })
      if (!res.ok) {
        const body = await res.json().catch(()=>({}))
        setErr(body.error || 'Upload failed')
      } else {
        const j = await res.json()
        setMsg('Uploaded ✓ (id: ' + (j.upload_id || 'unknown') + ')')
      }
    } catch (err) {
      setErr('Network error')
    } finally { setUploading(false) }
  }

  return (
    <div>
      <nav className="nav">
        <div className="nav-inner">
          <div style={{fontWeight:700}}>Dashboard</div>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <button onClick={doLogout} className="btn btn-ghost">Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="grid">
          <div className="card">
            <h3 style={{marginTop:0}}>Welcome</h3>
            <p className="small-muted">This is a faculty dashboard placeholder. Upload a CSV (handled by FastAPI later — currently stored in Go stub).</p>

            <div style={{marginTop:12}}>
              <label style={{display:'inline-block', marginBottom:8}}>Upload CSV</label>
              <input type="file" accept=".csv,text/csv" onChange={onFileChange} />
              <div style={{marginTop:10}}>
                <button className="btn btn-primary" onClick={()=>document.querySelector('input[type=file]').click()} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Choose CSV'}
                </button>
                <span style={{marginLeft:12}} className="small-muted">{msg}</span>
              </div>
              {err && <div className="error-msg" style={{marginTop:8}}>{err}</div>}
            </div>
          </div>

          <aside className="aside">
            <div className="card">
              <h4 style={{margin:'0 0 8px 0'}}>Quick Info</h4>
              <div className="small-muted">Role: <strong>Faculty</strong></div>
              <div className="small-muted" style={{marginTop:8}}>Courses: <em>Not assigned</em></div>
            </div>

            <div className="card">
              <h4 style={{margin:'0 0 8px 0'}}>Notes</h4>
              <p className="small-muted">CSV ingestion will be handled by dedicated FastAPI service in the next phase — this is a temporary storage endpoint.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
