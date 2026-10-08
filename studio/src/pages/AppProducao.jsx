import {Link} from 'react-router-dom'
export default function AppProducao(){
  return <div className="comercial-page"><section className="card card-pad" style={{maxWidth:680,margin:'40px auto'}}>
    <span className="admin-eyebrow">USET · PRODUÇÃO</span>
    <h1>A produção terá seu próprio app</h1>
    <p>A gestão de equipes, blocos, montagem e pendências foi retirada do Personalização. Essas funções serão concentradas no app irmão, baseado no Pendências CAS.</p>
    <p>As configurações aprovadas dos estandes e os registros existentes foram preservados. O novo aplicativo ainda está em preparação.</p>
    <Link className="btn" to="/conta">Minha conta</Link>
  </section></div>
}
