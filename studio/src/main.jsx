import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/app.css'
import {Capacitor} from '@capacitor/core'

if(Capacitor.isNativePlatform()&&window.location.pathname==='/')window.history.replaceState(null,'','/producao')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
