import { useId, useRef } from 'react'

export default function BotaoReiniciar({ disabled, aoReiniciar }) {
  const dialogo = useRef(null)
  const cancelar = useRef(null)
  const titulo = useId()
  const descricao = useId()
  return <>
    <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => { dialogo.current.showModal(); cancelar.current.focus() }}>↺ Recomeçar personalização</button>
    <dialog ref={dialogo} className="dialogo-reiniciar card card-pad" aria-labelledby={titulo} aria-describedby={descricao}>
      <h2 id={titulo}>Recomeçar do projeto original?</h2>
      <div id={descricao}>
        <p>As cores, artes, inclusões, substituições e pontos elétricos adicionais serão removidos. Os móveis voltarão às posições definidas pela USET.</p>
        <p>O rascunho e o histórico de desfazer serão reiniciados. Propostas já enviadas permanecem salvas.</p>
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button ref={cancelar} type="button" className="btn" onClick={() => dialogo.current.close()}>Continuar personalizando</button>
        <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => { aoReiniciar(); dialogo.current.close() }}>Sim, recomeçar</button>
      </div>
    </dialog>
  </>
}
