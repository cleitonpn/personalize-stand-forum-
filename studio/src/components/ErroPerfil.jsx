import { useAuth } from '../store/AuthContext.jsx'
export default function ErroPerfil(){
  const {erroPerfil,recarregarPerfil,sair}=useAuth()
  return <div className="card card-pad col" style={{maxWidth:460,margin:'60px auto',gap:14}}><h1>Vamos recuperar seu acesso</h1><p role="alert">{erroPerfil||'Seu perfil ainda não está disponível.'}</p><button className="btn btn-primary" onClick={recarregarPerfil}>Tentar novamente</button><button className="btn" onClick={sair}>Sair desta conta</button></div>
}
