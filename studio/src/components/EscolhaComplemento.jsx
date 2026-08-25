import { areaDaOpcao } from '../lib/glb/complementos.js'
import { fmtBRL } from '../lib/glb/precos.js'

/**
 * Uma pergunta do estande, para o expositor.
 *
 * Botões lado a lado, com o padrão sempre presente e sempre em primeiro. Nada de
 * caixa de seleção: o expositor precisa ver de uma vez o que existe para aquele
 * ponto, e precisa poder voltar ao projeto original com um clique — não
 * desmarcando algo que ele não sabe se marcou.
 */
export default function EscolhaComplemento({ grupo, escolhido, aoEscolher, compacto }) {
  const opcoes = (grupo.opcoes || []).filter((o) => o.arquivo?.url)
  if (!opcoes.length) return null

  const preco = (o) => {
    const v = o.preco?.valor || 0
    if (!v) return 'incluso'
    return o.preco.unidade === 'm2'
      ? fmtBRL(v * areaDaOpcao(o.bbox))
      : fmtBRL(v)
  }

  const Botao = ({ id, titulo, sub, ativo }) => (
    <button onClick={() => aoEscolher(id)}
      style={{
        flex: '1 1 130px', textAlign: 'left', padding: '9px 11px',
        borderRadius: 'var(--r)',
        background: ativo ? 'rgba(22,224,163,.1)' : 'var(--surface-2)',
        border: `1.5px solid ${ativo ? 'var(--brand-green)' : 'var(--line)'}`,
        transition: 'background var(--t) var(--ease), border-color var(--t) var(--ease)',
      }}>
      <span style={{
        display: 'block', fontSize: 12.5, fontWeight: 600,
        color: ativo ? 'var(--brand-green)' : 'var(--text)',
      }}>
        {ativo ? '✓ ' : ''}{titulo}
      </span>
      <span className="dim" style={{ fontSize: 11 }}>{sub}</span>
    </button>
  )

  return (
    <div style={{ marginTop: compacto ? 0 : 11 }}>
      <div className="label" style={{ fontSize: 10.5, marginBottom: 6 }}>{grupo.nome}</div>
      <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
        <Botao id={null} ativo={!escolhido}
          titulo={grupo.rotuloPadrao || 'Como está no projeto'} sub="sem custo" />
        {opcoes.map((o) => (
          <Botao key={o.id} id={o.id} ativo={escolhido === o.id} titulo={o.nome} sub={preco(o)} />
        ))}
      </div>
    </div>
  )
}
