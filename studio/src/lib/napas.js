import PADRAO from './napas.json' with { type: 'json' }

export const NAPAS = PADRAO
export function combinarNapas(registros=[]) {
  const itens=new Map(NAPAS.map(n=>[n.id,n]))
  for(const n of registros) itens.set(n.id,{...itens.get(n.id),...n})
  return [...itens.values()]
}
export const nomeNapa = n => `${n.nome}${n.codigo ? ` · ${n.codigo}` : ' · sem código informado'}`
export function napasDisponiveis(catalogo,tipo,superficies=[]) {
  return catalogo.filter(n=>n.ativo!==false && n.tipos?.includes(tipo)
    && superficies.every(s=>!Array.isArray(s.acabamentosPermitidos)||s.acabamentosPermitidos.includes(n.id)))
}
export function acabamentoNapa(n) {
  return {cor:n.cor,corId:n.id,corNome:n.nome,materialId:n.id,materialNome:n.nome,materialCodigo:n.codigo||null,
    materialFornecedor:n.fornecedor||null,textura:n.textura||null,escalaTextura:n.escala||.25,brilho:n.brilho??.15}
}
export function validarNapa(n) {
  if(!n.nome?.trim())return 'Informe o nome do acabamento.'
  if(!/^#[\da-f]{6}$/i.test(n.cor))return 'Escolha uma cor válida.'
  if(n.preco!=null&&(!Number.isFinite(n.preco)||n.preco<0))return 'O preço deve ser zero ou positivo.'
  if(!Number.isFinite(n.escala)||n.escala<.01||n.escala>10)return 'A largura da amostra deve ficar entre 0,01 e 10 metros.'
  if(!n.tipos?.length)return 'Selecione pelo menos um tipo de elemento.'
  if(n.familia==='especial'&&!n.textura)return 'Envie a imagem da napa especial.'
  return ''
}
