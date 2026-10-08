import {executarComercial} from './comercial.js'
export const PAPEIS_OPERACIONAIS={gerente_operacional:'Gerente operacional',analista_operacional:'Analista operacional',analista_cv:'Analista de CV',equipe_producao:'Equipe de produção',produtor:'Produtor',atendimento_comercial:'Atendimento comercial',mobiliario:'Mobiliário',analista_projeto:'Analista de projeto · consulta e orientações'}
export const ESPECIALIDADES={montagem:'Montagem',marcenaria:'Marcenaria',eletrica:'Elétrica',tapecaria:'Tapeçaria',mobiliario:'Mobiliário',cv:'Comunicação visual',logistica:'Logística'}
export const ehOperacional=p=>!!PAPEIS_OPERACIONAIS[p?.papel]
export const ehGestor=p=>['admin','gerente_operacional','analista_operacional'].includes(p?.papel)
export const operacao=d=>executarComercial('operacao',d)
export const estadoItem={incluido:'Incluído no projeto',acrescentado:'Acrescentado',substituido:'Substituído',retirado:'Retirado'}
