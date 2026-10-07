import { LOGO_VIEWBOX, LOGO_PARTES } from '../lib/showreel/logo.js'

/* Logotipo oficial. Herda a cor do texto: verde da marca no tema claro, branco no escuro. */
export default function LogoUset({ className = '' }) {
  return <svg className={'logo-uset ' + className} viewBox={LOGO_VIEWBOX} role="img" aria-label="USET" fill="currentColor">
    <path d={LOGO_PARTES.anel} /><path d={LOGO_PARTES.haste} />
    <path d={LOGO_PARTES.s} /><path d={LOGO_PARTES.e} /><path d={LOGO_PARTES.t} />
    <path fillRule="evenodd" d={LOGO_PARTES.registro[0]} /><path d={LOGO_PARTES.registro[1]} />
  </svg>
}
