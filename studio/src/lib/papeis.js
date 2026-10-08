export const PAPEIS_SITE={admin:'Administrador',organizadora:'Organizadora',expositor:'Expositor',analista_cv:'Analista de comunicação visual'}
// Contas existentes permanecem cadastradas; a operação terá sua própria interface.
export const PAPEIS_APP_IRMAO={gerente_operacional:'Gerente operacional',analista_operacional:'Analista operacional',equipe_producao:'Equipe de produção',produtor:'Produtor',atendimento_comercial:'Atendimento comercial',mobiliario:'Mobiliário',analista_projeto:'Analista de projeto'}
export const ehPerfilAppIrmao=perfil=>!!PAPEIS_APP_IRMAO[perfil?.papel]
