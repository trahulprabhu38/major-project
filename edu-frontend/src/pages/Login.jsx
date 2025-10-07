import React, {useState} from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Login(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const nav = useNavigate()

  const submit=async e=>{
    e.preventDefault()
    setError(''); setLoading(true)
    try{
      const res = await fetch('http://localhost:8080/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email,password})
      })
      if (!res.ok) {
        const body = await res.json().catch(()=>({}))
        setError(body.error || 'Login failed')
      } else {
        const json = await res.json()
        localStorage.setItem('token', json.token)
        nav('/dashboard')
      }
    } catch(err){
      setError('Network error')
    } finally { setLoading(false) }
  }

  return (
    <div className="container">
      <div style={{maxWidth:420, margin:'48px auto'}} className="card">
        <h2 style={{margin:0}}>Login</h2>
        <p className="small-muted">Enter credentials to continue.</p>

        <form onSubmit={submit} className="form" style={{marginTop:12}}>
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
          <input className="input" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} type="password" required />

          <div style={{display:'flex', gap:8, marginTop:6}}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <Link to="/signup" className="btn btn-ghost" style={{textDecoration:'none', display:'inline-flex', alignItems:'center'}}>Sign up</Link>
          </div>
          {error && <div className="error-msg" style={{marginTop:8}}>{error}</div>}
        </form>
      </div>
    </div>
  )
}
