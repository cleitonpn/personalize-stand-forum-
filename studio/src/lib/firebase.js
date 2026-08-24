import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// A config web do Firebase é pública por definição — ela é embarcada no bundle
// que vai para o navegador de qualquer usuário. Quem protege os dados são as
// regras do Firestore/Storage (firestore.rules / storage.rules), não esconder
// estas chaves. A chave PRIVADA (service account) fica só no secret do GitHub.
const firebaseConfig = {
  apiKey: 'AIzaSyANNFzO1_l02FNyiuWjrYUMb-I__PJZklw',
  authDomain: 'personalizacao-stand.firebaseapp.com',
  projectId: 'personalizacao-stand',
  storageBucket: 'personalizacao-stand.firebasestorage.app',
  messagingSenderId: '963867072819',
  appId: '1:963867072819:web:af000f991a0c5a706d0646',
  measurementId: 'G-NGPY3SW0EQ',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
