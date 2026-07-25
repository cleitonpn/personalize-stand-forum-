// ============================================================================
//  CATÁLOGO — fonte única de verdade de cores, produtos, preços e regras.
//  Cores extraídas dos catálogos Casa Brasil (códigos CB###). Os hex foram
//  amostrados dos swatches dos PDFs e curados. Trocar por valores oficiais
//  aqui reflete em todo o app automaticamente.
// ============================================================================

// ---------- CARPETES ----------
export const CARPETE_EVENTOS = [
  { id: 'ce-438', nome: 'Cinza', cb: 'CB438', hex: '#C7C9CB' },
  { id: 'ce-437', nome: 'Grafite', cb: 'CB437', hex: '#929493' },
  { id: 'ce-436', nome: 'Preto', cb: 'CB436', hex: '#2B2B2B' },
  { id: 'ce-448', nome: 'Azul Marinho', cb: 'CB448', hex: '#19253A' },
  { id: 'ce-454', nome: 'Azul Bic', cb: 'CB454', hex: '#2E5AAC' },
  { id: 'ce-451', nome: 'Turquesa', cb: 'CB451', hex: '#1CA0B8' },
  { id: 'ce-440', nome: 'Musgo', cb: 'CB440', hex: '#6E7A5E' },
  { id: 'ce-455', nome: 'Verde Grama', cb: 'CB455', hex: '#2E7D46' },
  { id: 'ce-449', nome: 'Verde Limão', cb: 'CB449', hex: '#9CCB3E' },
  { id: 'ce-443', nome: 'Bege', cb: 'CB443', hex: '#D9CCC6' },
  { id: 'ce-441', nome: 'Camelo', cb: 'CB441', hex: '#A67C52' },
  { id: 'ce-442', nome: 'Castor', cb: 'CB442', hex: '#8A7A6E' },
  { id: 'ce-446', nome: 'Vermelho', cb: 'CB446', hex: '#C0392B' },
  { id: 'ce-447', nome: 'Cereja', cb: 'CB447', hex: '#C43A5A' },
  { id: 'ce-450', nome: 'Amarelo', cb: 'CB450', hex: '#ECC30C' },
  { id: 'ce-452', nome: 'Laranja', cb: 'CB452', hex: '#E8873B' },
  { id: 'ce-445', nome: 'Magenta-Pink', cb: 'CB445', hex: '#E7379A' },
  { id: 'ce-026', nome: 'Rosa Bebê', cb: 'CB26', hex: '#EC8CA6' },
  { id: 'ce-457', nome: 'Roxo', cb: 'CB457', hex: '#7E4FA8' },
  { id: 'ce-019', nome: 'Lilás', cb: 'CB19', hex: '#C9A8DD' },
  { id: 'ce-444', nome: 'Cristal-Branco', cb: 'CB444', hex: '#E8E8E4' },
]

export const CARPETE_ECOLOOP = [
  { id: 'cl-324', nome: 'Preto', cb: 'CB324', hex: '#232323' },
  { id: 'cl-323', nome: 'Grafite', cb: 'CB323', hex: '#4A4A4A' },
  { id: 'cl-322', nome: 'Cinza', cb: 'CB322', hex: '#5B5B5B' },
  { id: 'cl-330', nome: 'Azul Marinho', cb: 'CB330', hex: '#1B2233' },
  { id: 'cl-328', nome: 'Musgo', cb: 'CB328', hex: '#55584E' },
  { id: 'cl-325', nome: 'Bege', cb: 'CB325', hex: '#CAB9B1' },
  { id: 'cl-327', nome: 'Castor', cb: 'CB327', hex: '#C7B29E' },
  { id: 'cl-326', nome: 'Camelo', cb: 'CB326', hex: '#A8895F' },
  { id: 'cl-329', nome: 'Vermelho', cb: 'CB329', hex: '#A83A38' },
  { id: 'cl-331', nome: 'Cereja', cb: 'CB331', hex: '#B5474E' },
]

// ---------- PISO VINÍLICO ----------
export const PISO_VINILICO = [
  { id: 'pv-branco-f', nome: 'Branco Fosco', cb: '', hex: '#E4E2DD' },
  { id: 'pv-branco-b', nome: 'Branco Brilhante', cb: '', hex: '#F0F0EE' },
  { id: 'pv-preto-f', nome: 'Preto Fosco', cb: '', hex: '#2A2A2A' },
  { id: 'pv-preto-b', nome: 'Preto Brilhante', cb: '', hex: '#1A1A1A' },
  { id: 'pv-marmore-b', nome: 'Mármore Bianco', cb: '', hex: '#E8E6E0' },
  { id: 'pv-marmore-p', nome: 'Mármore Preto', cb: '', hex: '#2E2E30' },
  { id: 'pv-086', nome: 'Cinza Claro', cb: 'CB086', hex: '#D7DED1' },
  { id: 'pv-076', nome: 'Cinza Amadeirado', cb: 'CB076', hex: '#8C8B78' },
  { id: 'pv-064', nome: 'Carvalho Mel', cb: 'CB064', hex: '#BF854D' },
  { id: 'pv-072', nome: 'Nogueira', cb: 'CB072', hex: '#824010' },
  { id: 'pv-075', nome: 'Imbuia', cb: 'CB075', hex: '#713813' },
  { id: 'pv-070', nome: 'Wengue', cb: 'CB070', hex: '#22160D' },
]

// ---------- NAPAS (revestimento de paredes) ----------
export const NAPA_LISAS = [
  { id: 'nl-156', nome: 'Preto', cb: 'CB156', hex: '#1E1E1E' },
  { id: 'nl-204', nome: 'Grafite', cb: 'CB204', hex: '#6E6F70' },
  { id: 'nl-203', nome: 'Cinza', cb: 'CB203', hex: '#AEB0AB' },
  { id: 'nl-714', nome: 'Prata', cb: 'CB714', hex: '#C6C7C6' },
  { id: 'nl-198', nome: 'Branco', cb: 'CB198', hex: '#EFEDE6' },
  { id: 'nl-333', nome: 'Azul Royal', cb: 'CB333', hex: '#03369D' },
  { id: 'nl-277', nome: 'Azul Marinho', cb: 'CB277', hex: '#182652' },
  { id: 'nl-332', nome: 'Azul Cancun', cb: 'CB332', hex: '#0964D9' },
  { id: 'nl-342', nome: 'Azul Guanabara', cb: 'CB342', hex: '#1A77D8' },
  { id: 'nl-605', nome: 'Azul Céu', cb: 'CB605', hex: '#7BB0DC' },
  { id: 'nl-685', nome: 'Azul Bebê', cb: 'CB685', hex: '#A0CDE5' },
  { id: 'nl-506', nome: 'Verde Pera', cb: 'CB506', hex: '#529C3C' },
  { id: 'nl-245', nome: 'Verde Bandeira', cb: 'CB245', hex: '#1F7A4B' },
  { id: 'nl-261', nome: 'Verde Primavera', cb: 'CB261', hex: '#8DBB46' },
  { id: 'nl-600', nome: 'Verde Limão', cb: 'CB600', hex: '#B9C635' },
  { id: 'nl-445', nome: 'Verde Água', cb: 'CB445', hex: '#A2DBD4' },
  { id: 'nl-mil', nome: 'Verde Militar', cb: 'CB457', hex: '#4A5334' },
  { id: 'nl-253', nome: 'Amarelo', cb: 'CB253', hex: '#F5C518' },
  { id: 'nl-794', nome: 'Amarelo Bebê', cb: 'CB794', hex: '#FFE9A0' },
  { id: 'nl-1955', nome: 'Mostarda', cb: 'CB1955', hex: '#C9A227' },
  { id: 'nl-338', nome: 'Fanta', cb: 'CB338', hex: '#F07A2E' },
  { id: 'nl-205', nome: 'Vermelho', cb: 'CB205', hex: '#C42127' },
  { id: 'nl-248', nome: 'Vinho', cb: 'CB248', hex: '#8A1030' },
  { id: 'nl-793', nome: 'Salmão', cb: 'CB793', hex: '#F6B3A0' },
  { id: 'nl-361', nome: 'Pink', cb: 'CB361', hex: '#E85C86' },
  { id: 'nl-351', nome: 'Roxo', cb: 'CB351', hex: '#6E4A8C' },
  { id: 'nl-678', nome: 'Lilás', cb: 'CB678', hex: '#D9A9D4' },
  { id: 'nl-422', nome: 'Rosa Bebê', cb: 'CB422', hex: '#E0A8C0' },
  { id: 'nl-430', nome: 'Creme', cb: 'CB430', hex: '#E8DFBE' },
  { id: 'nl-252', nome: 'Areia', cb: 'CB252', hex: '#D6C67B' },
  { id: 'nl-461', nome: 'Bege', cb: 'CB461', hex: '#D2C3A6' },
  { id: 'nl-1956', nome: 'Nude', cb: 'CB1956', hex: '#C8BCAF' },
  { id: 'nl-502', nome: 'Marrom', cb: 'CB502', hex: '#6B4A2E' },
  { id: 'nl-503', nome: 'Café', cb: 'CB503', hex: '#553924' },
  { id: 'nl-1957', nome: 'Telha', cb: 'CB1957', hex: '#B5533A' },
  { id: 'nl-462', nome: 'Uva', cb: 'CB462', hex: '#542626' },
]

export const NAPA_AMADEIRADAS = [
  { id: 'na-cinza', nome: 'Amadeirada Cinza', cb: '', hex: '#9A8F82' },
  { id: 'na-bege', nome: 'Amadeirada Bege', cb: '', hex: '#C3AE93' },
  { id: 'na-marron', nome: 'Amadeirada Marron', cb: '', hex: '#8B6A50' },
  { id: 'na-imbuia', nome: 'Imbuia', cb: '', hex: '#6E4A32' },
  { id: 'na-cafe', nome: 'Café', cb: '', hex: '#534541' },
  { id: 'na-malta', nome: 'Carvalho Malta', cb: '', hex: '#B4A792' },
  { id: 'na-studio', nome: 'Carvalho Studio', cb: '', hex: '#8E6B5E' },
  { id: 'na-dover', nome: 'Carvalho Dover', cb: '', hex: '#CDB894' },
  { id: 'na-treviso', nome: 'Carvalho Treviso', cb: '', hex: '#BDA47A' },
  { id: 'na-pinus', nome: 'Pinus Sevilha', cb: '', hex: '#DCC9A6' },
]

export const NAPA_ESPECIAIS = [
  { id: 'ne-cimento', nome: 'Cimento Queimado', cb: '', hex: '#8F8F8A' },
  { id: 'ne-stucco', nome: 'Stucco', cb: '', hex: '#C7BBB5' },
  { id: 'ne-concreto', nome: 'Concreto', cb: '', hex: '#A8A7AA' },
  { id: 'ne-tijolo', nome: 'Tijolo', cb: '', hex: '#9A5B45' },
  { id: 'ne-tijolo-c', nome: 'Tijolo Cinza', cb: '', hex: '#97989A' },
  { id: 'ne-tijolo-b', nome: 'Tijolo Branco', cb: '', hex: '#CFC9C2' },
  { id: 'ne-prata', nome: 'Prata', cb: '', hex: '#C9CAC4' },
  { id: 'ne-dourado', nome: 'Dourado', cb: 'CB2106', hex: '#C9A24E' },
  { id: 'ne-rip-carv', nome: 'Ripado Carvalho', cb: '', hex: '#A88A5C' },
  { id: 'ne-rip-ibuia', nome: 'Ripado Ibuia', cb: '', hex: '#7C6E5A' },
]

// Agrupamentos para os seletores de piso e parede
export const PISOS = {
  carpete_eventos: { rotulo: 'Carpete Eventos', itens: CARPETE_EVENTOS },
  carpete_ecoloop: { rotulo: 'Carpete Ecoloop', itens: CARPETE_ECOLOOP },
  vinilico: { rotulo: 'Piso Vinílico', itens: PISO_VINILICO },
}

export const NAPAS = {
  lisas: { rotulo: 'Napa Lisa', itens: NAPA_LISAS },
  amadeiradas: { rotulo: 'Napa Amadeirada', itens: NAPA_AMADEIRADAS },
  especiais: { rotulo: 'Napa Especial', itens: NAPA_ESPECIAIS },
}

// ---------- MOBILIÁRIO (biblioteca curada p/ o protótipo) ----------
// forma = como o placeholder é desenhado no 3D e na planta até chegar o GLB real.
export const MOBILIARIO = [
  { id: 'balcao', nome: 'Balcão c/ logo', forma: 'balcao', w: 2.0, d: 0.7, h: 1.1, preco: 0, base: true },
  { id: 'mesa-bistro', nome: 'Mesa bistrô + 3 banquetas', forma: 'bistro', w: 0.9, d: 0.9, h: 1.1, preco: 480 },
  { id: 'aparador', nome: 'Aparador 1,10 × 0,40', forma: 'aparador', w: 1.1, d: 0.4, h: 1.0, preco: 320 },
  { id: 'sofa', nome: 'Sofá 2 lugares', forma: 'sofa', w: 1.6, d: 0.85, h: 0.8, preco: 720 },
  { id: 'poltrona', nome: 'Poltrona', forma: 'poltrona', w: 0.8, d: 0.85, h: 0.8, preco: 340 },
  { id: 'mesa-centro', nome: 'Mesa de centro', forma: 'mesacentro', w: 0.7, d: 0.7, h: 0.4, preco: 180 },
  { id: 'expositor', nome: 'Expositor / vitrine', forma: 'expositor', w: 0.6, d: 0.6, h: 1.8, preco: 560 },
]

// ---------- PAISAGISMO ----------
export const PAISAGISMO = [
  { id: 'planta-alta', nome: 'Planta alta (folhagem)', forma: 'planta-alta', r: 0.35, h: 1.6, preco: 160 },
  { id: 'planta-vaso', nome: 'Vaso decorativo', forma: 'planta-vaso', r: 0.3, h: 0.9, preco: 110 },
  { id: 'jardim-vertical', nome: 'Jardim vertical 1m', forma: 'jardim', w: 1.0, d: 0.2, h: 2.0, preco: 890 },
]

// ---------- ELÉTRICA (pontos extras posicionáveis na planta) ----------
export const ELETRICA = [
  { id: 'tomada-piso', nome: 'Tomada no piso', simbolo: '▩', cor: '#f4c20d', preco: 90 },
  { id: 'tomada-parede', nome: 'Tomada de parede', simbolo: '◺', cor: '#f4c20d', preco: 70 },
  { id: 'spot', nome: 'Spot / refletor', simbolo: '◉', cor: '#ffd873', preco: 120 },
  { id: 'arandela', nome: 'Arandela', simbolo: '❉', cor: '#ffd873', preco: 140 },
]

// ---------- PREÇOS de itens estruturais ----------
export const PRECOS = {
  vinilicoUpgrade: 1900,     // troca de carpete por piso vinílico (área cheia)
  salaReuniao: 6800,         // sala de reunião de vidro (até 4x3) com porta
  led: {
    coluna1: 1600,           // painel de LED em 1 coluna frontal
    colunas2: 3000,          // painel de LED nas 2 colunas frontais
    testeira: 5400,          // painel de LED na testeira frontal + laterais
  },
  lonaParede: 700,           // lona impressa cobrindo uma parede
  logoExtra: 260,            // logo adicional
}

// ---------- REGRAS de negócio (limites de fabricação) ----------
export const REGRAS = {
  stand: { largura: 10.0, profundidade: 4.0 },
  deposito: { areaMin: 3.45, wMin: 1.5, wMax: 3.0, dMin: 1.2, dMax: 2.3 }, // ~2,3x1,5 original
  salaReuniao: { wMax: 4.0, dMax: 3.0, wMin: 2.5, dMin: 2.0 },
  margemParede: 0.15,
}

export const CLIENTE_DEMO = {
  usuario: 'cliente',
  senha: '1234',
  empresa: 'Sua Marca Ltda.',
  opcao: 'C',
  area: 40,
  medidas: '10,00 × 4,00 m',
}

export const fmtBRL = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// helper: acha uma cor pelo id em qualquer catálogo
const TODOS = [
  ...CARPETE_EVENTOS, ...CARPETE_ECOLOOP, ...PISO_VINILICO,
  ...NAPA_LISAS, ...NAPA_AMADEIRADAS, ...NAPA_ESPECIAIS,
]
export const corPorId = (id) => TODOS.find((c) => c.id === id) || null
