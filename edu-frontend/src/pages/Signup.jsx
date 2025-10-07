import React, {useState} from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [name,setName]=useState('')
  const [role,setRole]=useState('faculty')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('http://localhost:8080/signup', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email,password,name,role})
      })
      if (!res.ok) {
        const body = await res.json().catch(()=>({}))
        setError(body.error || 'Signup failed')
      } else {
        nav('/login')
      }
    } catch (err) {
      setError('Network error')
    } finally { setLoading(false) }
  }

  return (
    <div className="container">
      <div style={{maxWidth:420, margin:'48px auto'}} className="card">
        <h2 style={{margin:0}}>Sign up</h2>
        <p className="small-muted">Create a faculty or student account.</p>

        <form onSubmit={submit} className="form" style={{marginTop:12}}>
          <input className="input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
          <input className="input" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} type="password" required />
          <select className="select" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="faculty">Faculty</option>
            <option value="student">Student</option>
          </select>

          <div style={{display:'flex', gap:8, marginTop:6}}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
            <Link to="/login" className="btn btn-ghost" style={{textDecoration:'none', display:'inline-flex', alignItems:'center'}}>Login</Link>
          </div>
          {error && <div className="error-msg" style={{marginTop:8}}>{error}</div>}
        </form>
      </div>
    </div>
  )
}
