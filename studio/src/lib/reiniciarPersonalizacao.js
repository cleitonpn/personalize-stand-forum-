/** A base é a configuração publicada pelo admin, incluindo posições dos móveis. */
export function estadoOriginal(modelo) {
  return { acabamentos: {}, escolhas: {}, objetos: structuredClone(modelo.objetos || []) }
}

export function reiniciarPersonalizacao(modelo, chaveRascunho, chaveJornada, obterStorage = () => localStorage) {
  const estado = estadoOriginal(modelo)
  let persistido = true
  try {
    const storage = obterStorage()
    // Grava imediatamente: recarregar antes do autosave não pode recuperar escolhas antigas.
    storage.setItem(chaveRascunho, JSON.stringify({
      versao: modelo.atualizadoEm?.seconds || 0,
      acabamentos: {}, escolhas: {},
      transformes: Object.fromEntries(estado.objetos.map(o => [o.id, o.transform || { dx: 0, dz: 0, rotY: 0 }])),
    }))
  } catch { persistido = false }
  try { obterStorage().removeItem(chaveJornada) } catch { persistido = false }
  return { estado, persistido }
}
