import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import Viewer, { useGLB } from '../components/Viewer.jsx'
export default function ProjetoConsulta() {
  const { id } = useParams(),
    [modelo, setModelo] = useState(null),
    [erro, setErro] = useState('')
  const glb = useGLB(modelo?.arquivo?.url)
  useEffect(() => {
    setModelo(null)
    setErro('')
    getDoc(doc(db, 'modelos', id))
      .then((s) => {
        if (!s.exists()) throw Error('Projeto não encontrado.')
        setModelo(s.data())
      })
      .catch((e) => setErro(e.message))
  }, [id])
  return (
    <div className="comercial-page">
      <Link className="btn" to="/modelos">
        ← Projetos
      </Link>
      <h1>{modelo?.nome || 'Consulta do projeto'}</h1>
      <p>
        Visualização para a organizadora. A configuração e os preços são
        definidos pela USET.
      </p>
      {(erro || glb.erro) && (
        <p role="alert">{erro || 'Não foi possível carregar o GLB.'}</p>
      )}
      {glb.carregando && <p>Carregando projeto…</p>}
      <div style={{ height: '65vh', borderRadius: 20, overflow: 'hidden' }}>
        <Viewer cena={glb.cena} realceSuave />
      </div>
    </div>
  )
}
