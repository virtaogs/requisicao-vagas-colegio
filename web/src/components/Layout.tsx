import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'

const LABEL_PAPEL: Record<string, string> = {
  solicitante: 'Solicitante',
  aprovador: 'Aprovador',
  rh: 'RH',
}

export default function Layout({ children }: { children: ReactNode }) {
  const { perfil, signOut } = useAuth()

  return (
    <div className="layout">
      <header className="topo">
        <div>
          <strong>Requisição de Vagas</strong>
          {perfil && <span className="badge-papel">{LABEL_PAPEL[perfil.papel]}</span>}
        </div>
        <div className="topo-usuario">
          {perfil && <span>{perfil.nome}{perfil.unidade ? ` · ${perfil.unidade}` : ''}</span>}
          <button className="link" onClick={() => signOut()}>
            Sair
          </button>
        </div>
      </header>
      <main className="conteudo">{children}</main>
    </div>
  )
}
