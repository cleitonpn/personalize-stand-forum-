import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { db, auth } from '../lib/firebase.js'
import { definirSenhaProvisoria } from '../lib/funcoes.js'
import { executarComercial } from '../lib/comercial.js'
import ExcluirCadastro from './ExcluirCadastro.jsx'

/**
 * Gestão de um expositor.
 *
 * Exclusões passam pelo servidor para remover o login e preservar o histórico.
 */
export default function GerenciarExpositor({ cliente, modelos, aoMudar, aoFechar }) {
  const [f, setF] = useState({
    nome: cliente.nome || '',
    feira: cliente.feira || '',
    modeloId: cliente.modeloId || '',
  })
  const [msg, setMsg] = useState(null)
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')

  const campo = (k) => ({ value: f[k], onChange: (e) => setF((v) => ({ ...v, [k]: e.target.value })) })
  const ativo = cliente.ativo !== false

  const executar = async (fn, sucesso) => {
    setMsg(null); setErro(null); setOcupado(true)
    try { await fn(); setMsg(sucesso); aoMudar?.() }
    catch (ex) {
      setErro(ex.code === 'permission-denied'
        ? 'Sem permissão. Publique as regras do Firestore atualizadas.'
        : ex.message)
    }
    finally { setOcupado(false) }
  }

  const salvar = () => executar(
    () => updateDoc(doc(db, 'usuarios', cliente.id), {
      nome: f.nome.trim(), empresa: f.nome.trim(),
    }),
    'Dados atualizados.')

  const alternarAtivo = () => executar(
    () => executarComercial('administrarUsuarios', { acao:'acesso', uid:cliente.id, ativo:!ativo }),
    ativo ? 'Acesso desativado.' : 'Acesso reativado.')

  const redefinir = () => executar(
    async () => {
      const r=await executarComercial('administrarUsuarios',{acao:'redefinir',uid:cliente.id})
      await sendPasswordResetEmail(auth, r.email)
    },
    `Link de redefinição enviado para ${cliente.email}.`)

  const definirSenha = () => executar(
    async () => {
      await definirSenhaProvisoria(cliente.id, novaSenha)
      setNovaSenha('')
    },
    'Nova senha provisória definida. Passe-a ao expositor.')


  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center',
      background: 'rgba(4,6,13,.8)', backdropFilter: 'blur(6px)', padding: 24,
    }} onClick={aoFechar}>
      <div className="card card-pad fade-up" style={{ maxWidth: 460, width: '100%', maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}>

        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontSize: 18 }}>{cliente.nome || cliente.email}</h2>
          <button className="btn btn-ghost btn-sm" onClick={aoFechar}>Fechar</button>
        </div>
        <div className="dim" style={{ fontSize: 12.5, marginBottom: 18 }}>
          {cliente.email}
          {!ativo && <span style={{ color: 'var(--warn)' }}> · acesso desativado</span>}
        </div>

        <div className="col" style={{ gap: 13 }}>
          <div className="field">
            <label className="label">Nome</label>
            <input className="input" {...campo('nome')} />
          </div>
          <div className="field">
            <label className="label">Feira</label>
            <input className="input" value={cliente.feira || 'Use o botão Vincular feira e projeto'} readOnly />
          </div>
          <div className="field">
            <label className="label">Projeto do estande</label>
            <select className="select" value={cliente.modeloId || ''} disabled>
              <option value="">Sem projeto vinculado</option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}{m.feira ? ` — ${m.feira}` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {msg && (
          <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 'var(--r)', fontSize: 12.5,
            background: 'rgba(22,224,163,.08)', border: '1px solid var(--brand-green)', color: 'var(--brand-green)' }}>{msg}</div>
        )}
        {erro && (
          <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 'var(--r)', fontSize: 12.5,
            background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', color: '#fda4af' }}>{erro}</div>
        )}

        <button className="btn btn-primary" onClick={salvar} disabled={ocupado}
          style={{ width: '100%', marginTop: 16, padding: 11 }}>
          {ocupado ? <><span className="spinner" /> Salvando…</> : 'Salvar alterações'}
        </button>

        <div className="hr" />

        <div className="label" style={{ marginBottom: 9 }}>Acesso</div>
        <div className="col" style={{ gap: 8 }}>
          <button className="btn" onClick={redefinir} disabled={ocupado}>
            Enviar link de nova senha
          </button>
          <div className="row" style={{ gap: 7 }}>
            <input className="input" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Definir senha provisória" style={{ padding: '8px 11px', fontSize: 12.5 }} />
            <button className="btn btn-sm" style={{ flex: 'none' }} disabled={ocupado || novaSenha.length < 6}
              onClick={definirSenha}>Definir</button>
          </div>
          <button className="btn" onClick={alternarAtivo} disabled={ocupado}>
            {ativo ? 'Desativar acesso' : 'Reativar acesso'}
          </button>
          <p className="dim" style={{ margin: '2px 0 0', fontSize: 11.5, lineHeight: 1.6 }}>
            Desativar bloqueia a entrada na hora e pode ser desfeito. É o caminho
            recomendado quando o expositor não deve mais acessar.
          </p>
        </div>

        <div className="hr" />

        {!confirmando ? (
          <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => setConfirmando(true)}>
            Excluir expositor
          </button>
        ) : (
          <ExcluirCadastro tipo="usuario" id={cliente.id} aoCancelar={()=>setConfirmando(false)} aoExcluir={async()=>{await aoMudar?.();aoFechar?.()}}/>
        )}
      </div>
    </div>
  )
}
