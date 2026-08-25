import { useState } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { db, auth } from '../lib/firebase.js'

/**
 * Gestão de um expositor.
 *
 * Um limite do Firebase molda esta tela: pelo navegador não dá para apagar a
 * conta de OUTRO usuário no Auth — deleteUser só age sobre quem está logado.
 * Isso exigiria uma Cloud Function com o Admin SDK.
 *
 * Então "desativar" é a operação completa e reversível: bloqueia o acesso na
 * hora, sem depender de backend. "Excluir" remove o perfil, o que também
 * bloqueia o acesso, mas o registro no Auth permanece — e a tela diz isso em
 * vez de fingir que sumiu.
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
      nome: f.nome.trim(), feira: f.feira.trim() || null, modeloId: f.modeloId || null,
    }),
    'Dados atualizados.')

  const alternarAtivo = () => executar(
    () => updateDoc(doc(db, 'usuarios', cliente.id), { ativo: !ativo }),
    ativo ? 'Acesso desativado.' : 'Acesso reativado.')

  const redefinir = () => executar(
    async () => {
      await sendPasswordResetEmail(auth, cliente.email)
      await updateDoc(doc(db, 'usuarios', cliente.id), { precisaTrocarSenha: true })
    },
    `Link de redefinição enviado para ${cliente.email}.`)

  const excluir = () => executar(
    () => deleteDoc(doc(db, 'usuarios', cliente.id)),
    'Perfil excluído. O acesso está bloqueado.')

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
            <input className="input" {...campo('feira')} placeholder="Eletrolar Show" />
          </div>
          <div className="field">
            <label className="label">Projeto do estande</label>
            <select className="select" {...campo('modeloId')}>
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
          <div style={{ padding: '12px 13px', borderRadius: 'var(--r)',
            background: 'rgba(244,63,94,.07)', border: '1px solid rgba(244,63,94,.3)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#fda4af' }}>
              Excluir {cliente.nome || cliente.email}?
            </div>
            <p className="muted" style={{ margin: '0 0 8px', fontSize: 12, lineHeight: 1.6 }}>
              O perfil é apagado e o acesso deixa de funcionar. As propostas já
              enviadas continuam na sua lista.
            </p>
            <p className="dim" style={{ margin: '0 0 12px', fontSize: 11.5, lineHeight: 1.6 }}>
              O login em si permanece no Firebase Authentication — apagá-lo de vez
              exige removê-lo pelo Console, e enquanto ele existir esse e-mail não
              pode ser cadastrado de novo.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => setConfirmando(false)}>Cancelar</button>
              <button className="btn btn-sm btn-danger" style={{ flex: 1 }} disabled={ocupado}
                onClick={async () => { await excluir(); aoFechar?.() }}>
                Excluir mesmo assim
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
