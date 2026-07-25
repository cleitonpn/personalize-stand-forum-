import { useState } from 'react'
import { CLIENTE_DEMO } from '../data/catalogo.js'

export default function Login({ onEntrar }) {
  const [u, setU] = useState('')
  const [s, setS] = useState('')
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (u.trim() === CLIENTE_DEMO.usuario && s === CLIENTE_DEMO.senha) onEntrar()
    else setErr('Usuário ou senha inválidos.')
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <span className="login-logo">FÓRUM</span>
        <h1>Personalize seu Stand</h1>
        <p className="lead">
          Acesse com o login liberado após a compra do seu espaço no
          Fórum E-commerce Brasil e monte seu estande do seu jeito.
        </p>
        <label>Usuário</label>
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder="cliente" autoFocus />
        <label>Senha</label>
        <input type="password" value={s} onChange={(e) => setS(e.target.value)} placeholder="••••" />
        {err && <div className="login-err">{err}</div>}
        <button className="btn btn-primary go" type="submit">Entrar</button>
        <div className="demo">Demo — usuário <b>cliente</b> · senha <b>1234</b></div>
      </form>
    </div>
  )
}
