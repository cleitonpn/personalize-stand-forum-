import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext.jsx'
import LogoUset from '../components/LogoUset.jsx'
import ShowreelInicio from '../components/ShowreelInicio.jsx'
import '../styles/apresentacao.css'

export default function Apresentacao(){
  const {user,ehAdmin,perfil}=useAuth()
  const destino=user?(ehAdmin||perfil?.papel==='organizadora'?'/modelos':'/meu-estande'):'/entrar'
  const [tema,setTema]=useState('escuro')
  return <div className="uset-home">
    <div className="uset-topo" data-tema={tema}><header className="uset-nav"><Link to="/" className="uset-assinatura" aria-label="USET Studio — início"><LogoUset/><span>STUDIO</span></Link><nav aria-label="Conheça o Studio"><a href="#como-funciona">Como funciona</a><a href="#compromisso">Nosso compromisso</a><Link className="uset-acesso" to={destino}>{user?'Acessar meu painel':'Entrar no Studio'} ↗</Link></nav></header></div>
    <ShowreelInicio destino={destino} rotulo="Personalizar meu estande" aoMudarTema={setTema}/>
    <div>
      <section id="como-funciona" className="uset-como"><div><p className="uset-eyebrow">DA IDEIA AO EVENTO</p><h2>Você escolhe.<br/>A gente cuida dos detalhes.</h2><p>Não precisa saber usar ferramentas 3D. Seu projeto já tem uma base: você decide o que manter e o que personalizar.</p></div><ol>{[['Conheça o que já está incluído','Veja o projeto preparado para você e os itens que fazem parte do seu estande.'],['Deixe sua marca no espaço','Escolha cores, envie artes, organize móveis e indique onde precisa de pontos elétricos.'],['Revise com a USET','Confira as escolhas e os valores adicionais. Envie sua personalização para a nossa equipe acompanhar.']].map(([titulo,descricao],i)=><li key={titulo}><span>0{i+1}</span><div><h3>{titulo}</h3><p>{descricao}</p></div></li>)}</ol></section>
      <section id="compromisso" className="uset-compromisso"><div className="uset-compromisso-topo"><p className="uset-eyebrow">UM NOVO OLHAR PARA OS EVENTOS</p><h2>Mais possibilidades.<br/><em>Mais responsabilidade.</em></h2><p>A USET desenvolve projetos com módulos reutilizáveis, unindo personalização e uso consciente de recursos.</p></div><div className="uset-pilares"><article><span>01 / REUTILIZAÇÃO</span><h3>Uma estrutura.<br/>Novas histórias.</h3><p>O reaproveitamento de estruturas, acabamentos e materiais faz parte da proposta construtiva da USET.</p></article><article><span>02 / PROCESSO</span><h3>Preparar antes.<br/>Montar melhor.</h3><p>Os módulos recebem acabamentos nas instalações da empresa e seguem preparados para a montagem no evento.</p></article><article><span>03 / PESSOAS</span><h3>Impacto que vai<br/>além do estande.</h3><p>Com a iniciativa USEG, a USET apresenta ações de sustentabilidade, responsabilidade social e inclusão de pessoas com deficiência.</p></article></div><div className="uset-fontes"><a href="https://stand.uset.com.br/quem-somos2/" target="_blank" rel="noreferrer">Conheça a USET e a iniciativa USEG ↗</a><a href="https://stand.uset.com.br/o-que-fazemos/" target="_blank" rel="noreferrer">Nosso jeito de construir ↗</a></div></section>
      <section className="uset-convite"><p className="uset-eyebrow">VAMOS DAR FORMA À SUA MARCA?</p><h2>Seu próximo evento<br/>começa aqui.</h2><Link className="uset-cta" to={destino}>Acessar meu projeto <span>↗</span></Link><a href="mailto:contato@uset.com.br">Ainda não tem acesso? Fale com a USET</a></section>
    </div><footer className="uset-footer"><Link className="uset-assinatura" to="/" aria-label="USET Studio — início"><LogoUset/><span>STUDIO</span></Link><p>Personalização de estandes com a USET.</p><a href="https://stand.uset.com.br/" target="_blank" rel="noreferrer">Visite nosso site ↗</a></footer>
  </div>
}
