import { adicionarMovel, ajustarMovel, instanciasMobiliario, limiteMobiliario, LIMITE_MOBILIARIO } from '../lib/glb/mobiliario.js'
import { fmtBRL } from '../lib/glb/precos.js'
import { areaDaOpcao } from '../lib/glb/complementos.js'

export default function CatalogoMobiliario({ grupos, escolhas, setEscolhas, limites, elementos, foco, aoFocar }) {
  const atualizar = (g, fn) => setEscolhas(es => ({ ...es, [g.id]: fn(es?.[g.id]) }))
  return <section className="col" style={{ gap: 14 }} aria-label="Incluir ou substituir mobiliário">
    <div className="orientacao"><strong>Incluir ou substituir mobiliário</strong>
      <p>Adicione quantas unidades precisar, dentro do limite disponível. Para trocar os móveis do projeto, use Substituir. Cada arquivo pode representar uma peça ou um conjunto completo.</p>
      <small>Confira o espaço livre na vista de cima. Você pode mover, girar e remover cada unidade.</small>
    </div>
    {!grupos.length && <p className="muted">A equipe ainda não liberou mobiliário adicional para este projeto.</p>}
    {grupos.map(g => {
      const itens = instanciasMobiliario(escolhas?.[g.id])
      const opcoes = (g.opcoes || []).filter(o => o.arquivo?.url)
      return <article key={g.id} className="card card-pad col" style={{ gap: 12 }}>
        <strong>{g.nome}</strong>
        {opcoes.map(o => {
          const unidades = itens.filter(i => i.opcaoId === o.id)
          const cheio = unidades.length >= limiteMobiliario(o) || itens.length >= LIMITE_MOBILIARIO
          const nomes = (elementos || []).filter(e => e.superficies.some(s => o.esconde?.includes(s.id))).map(e => e.nome)
          const valor = (o.preco?.valor || 0) * (o.preco?.unidade === 'm2' ? areaDaOpcao(o.bbox) : 1)
          return <div key={o.id} className="col" style={{ gap: 9, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <strong>{o.nome}</strong>
            <small className="dim">{fmtBRL(valor)} por unidade · {unidades.length} de {limiteMobiliario(o)} selecionadas</small>
            {o.bbox && <small className="dim">{o.bbox.largura.toFixed(2)} × {o.bbox.profundidade.toFixed(2)} m · altura {o.bbox.altura.toFixed(2)} m</small>}
            <div className="filtros-elementos">
              <button className="btn" disabled={cheio} onClick={() => atualizar(g, e => adicionarMovel(g, e, o, false, limites))}>+ Adicionar {o.nome}</button>
              {!!o.esconde?.length && <button className="btn" disabled={cheio} onClick={() => atualizar(g, e => adicionarMovel(g, e, o, true, limites))}>Substituir por {o.nome}</button>}
            </div>
            {nomes.length > 0 && <small className="dim">Ao substituir, saem: {nomes.join(', ')}. O valor acima é o adicional da troca.</small>}
            {unidades.map((i, n) => {
              const chaveFoco = `extra:${g.id}:${i.id}`
              const editando = foco === chaveFoco
              const mudar = patch => atualizar(g, e => ({ itens: instanciasMobiliario(e).map(x => x.id === i.id ? ajustarMovel(o, x, patch, limites) : x) }))
              return <div className="card card-pad col" style={{ gap: 9 }} key={i.id}>
                <strong>{o.nome} · unidade {n + 1}</strong>
                <small>{i.substituir ? 'Substitui os móveis indicados acima' : 'Acrescentada ao projeto'}</small>
                <div className="filtros-elementos">
                  <button className="btn btn-sm" aria-expanded={editando} onClick={() => aoFocar(editando ? null : chaveFoco)}>Ajustar posição</button>
                  <button className="btn btn-sm" onClick={() => atualizar(g, e => ({ itens: instanciasMobiliario(e).filter(x => x.id !== i.id) }))}>Remover unidade {n + 1}</button>
                </div>
                {editando && <>
                  <small className="dim">Cada seta move 25 cm. Use a vista de cima para conferir.</small>
                  <div className="filtros-elementos">{[['←', -0.25, 0, 'esquerda'], ['↑', 0, -0.25, 'fundo'], ['↓', 0, 0.25, 'frente'], ['→', 0.25, 0, 'direita']].map(([texto, x, z, nome]) =>
                    <button className="btn" key={nome} aria-label={`Mover unidade para ${nome}`} onClick={() => mudar({ offset: [(i.offset?.[0] || 0) + x, i.offset?.[1] || 0, (i.offset?.[2] || 0) + z] })}>{texto}</button>)}</div>
                  <div className="filtros-elementos">{[-1, 1].map(s => <button className="btn btn-sm" key={s} onClick={() => mudar({ rotY: (i.rotY || 0) + s * Math.PI / 12 })}>{s < 0 ? '↶' : '↷'} Girar 15°</button>)}</div>
                  <small className="dim">Rotação: {Math.round((i.rotY || 0) * 180 / Math.PI)}°</small>
                  <button className="btn btn-sm" onClick={() => mudar({ offset: o.offset || [0, 0, 0], rotY: 0 })}>Voltar à posição sugerida</button>
                </>}
                {!!o.esconde?.length && <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={!!i.substituir} onChange={e => mudar({ substituir: e.target.checked })} />Substituir mobiliário padrão com esta unidade</label>}
              </div>
            })}
          </div>
        })}
        {itens.length > 0 && <button className="btn btn-sm" onClick={() => atualizar(g, () => null)}>Restaurar mobiliário original — {g.nome}</button>}
      </article>
    })}
  </section>
}
