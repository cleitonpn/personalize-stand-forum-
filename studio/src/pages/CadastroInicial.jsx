import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../store/AuthContext.jsx'

export default function CadastroInicial() {
  const { user, perfil, recarregarPerfil } = useAuth()
  const [f, setF] = useState({
    contatoNome: perfil.contatoNome || '',
    telefone: perfil.telefone || '',
    cargo: perfil.cargo || '',
    localizacao: perfil.localizacao || '',
  })
  const [erro, setErro] = useState(''),
    [ocupado, setOcupado] = useState(false)
  const campo = (k) => ({
    value: f[k],
    onChange: (e) => setF({ ...f, [k]: e.target.value }),
  })
  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setOcupado(true)
    try {
      if (f.telefone.replace(/\D/g, '').length < 10)
        throw new Error('Informe o telefone com DDD.')
      await updateDoc(doc(db, 'usuarios', user.uid), {
        ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()])),
        cadastroCompleto: true,
        localizacaoPendente: !f.localizacao.trim(),
      })
      await recarregarPerfil()
    } catch (ex) {
      setErro(ex.message)
    } finally {
      setOcupado(false)
    }
  }
  return (
    <form
      className="card card-pad col"
      style={{ maxWidth: 540, margin: '40px auto', gap: 18 }}
      onSubmit={enviar}
    >
      <h1>Vamos completar seu cadastro</h1>
      <p>
        {perfil.empresa || perfil.nome} · {user.email}
      </p>
      <label>
        Nome do responsável
        <input
          className="input"
          required
          maxLength={180}
          autoComplete="name"
          {...campo('contatoNome')}
        />
      </label>
      <label>
        Telefone com DDD
        <input
          className="input"
          required
          maxLength={30}
          type="tel"
          autoComplete="tel"
          {...campo('telefone')}
        />
      </label>
      <label>
        Cargo (opcional)
        <input className="input" maxLength={180} {...campo('cargo')} />
      </label>
      <label>
        Localização do estande (opcional)
        <input
          className="input"
          maxLength={180}
          placeholder="Pavilhão, rua e número do estande"
          {...campo('localizacao')}
        />
      </label>
      <p className="muted">
        Se ainda não souber a localização, a organizadora poderá preencher
        depois. Isso não impede sua personalização.
      </p>
      {erro && <p role="alert">{erro}</p>}
      <button className="btn btn-primary" disabled={ocupado}>
        {ocupado ? 'Salvando…' : 'Concluir cadastro e personalizar'}
      </button>
    </form>
  )
}
