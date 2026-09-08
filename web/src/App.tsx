import './App.css'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import SolicitantePage from './pages/SolicitantePage'
import AprovadorPage from './pages/AprovadorPage'
import RHPage from './pages/RHPage'

function Conteudo() {
  const { session, perfil, loading } = useAuth()

  if (loading) return <div className="tela-cheia">Carregando…</div>

  if (!session) return <Login />

  if (!perfil) {
    return (
      <div className="tela-cheia">
        <p>
          Seu usuário está autenticado, mas não tem um perfil cadastrado (solicitante, aprovador
          ou RH). Peça para o RH vincular seu login a um cadastro em <code>usuarios_app</code>.
        </p>
      </div>
    )
  }

  return (
    <Layout>
      {perfil.papel === 'solicitante' && <SolicitantePage />}
      {perfil.papel === 'aprovador' && <AprovadorPage />}
      {perfil.papel === 'rh' && <RHPage />}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Conteudo />
    </AuthProvider>
  )
}
