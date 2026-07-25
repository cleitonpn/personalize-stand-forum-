import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { erro: null } }
  static getDerivedStateFromError(erro) { return { erro } }
  componentDidCatch(erro, info) { console.error('ErrorBoundary:', erro, info) }
  render() {
    if (this.state.erro) {
      return (
        <div style={{ padding: 24, color: '#e9ebf0', fontSize: 13 }}>
          <b>{this.props.rotulo || 'Componente'} indisponível.</b>
          <div style={{ color: '#9aa0ad', marginTop: 6 }}>{String(this.state.erro?.message || this.state.erro)}</div>
        </div>
      )
    }
    return this.props.children
  }
}
