import type { ReactNode } from 'react'
import { MOTIVO_LABEL, STATUS_LABEL, URGENCIA_LABEL, type Requisicao } from '../lib/types'

function formatarData(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function RequisicaoCard({
  requisicao,
  mostrarSolicitante = false,
  acoes,
}: {
  requisicao: Requisicao
  mostrarSolicitante?: boolean
  acoes?: ReactNode
}) {
  const r = requisicao
  return (
    <div className="requisicao-card">
      <div className="cartao-titulo" style={{ marginBottom: 0 }}>
        <h4>{r.cargo}</h4>
        <span className={`badge-status ${r.status}`}>{STATUS_LABEL[r.status]}</span>
      </div>
      <div className="meta">
        {r.unidade} · {r.quantidade_solicitada} posição(ões)
        {r.quantidade_aprovada != null ? ` · aprovado: ${r.quantidade_aprovada}` : ''}
      </div>
      {mostrarSolicitante && (
        <div className="meta">Solicitante: {r.usuarios_app?.nome ?? '—'} · {formatarData(r.criado_em)}</div>
      )}
      {r.urgencia !== 'normal' && (
        <span className="badge-urgencia">
          {URGENCIA_LABEL[r.urgencia]}
          {r.prazo ? ` (prazo: ${formatarData(r.prazo)})` : ''}
        </span>
      )}
      <details>
        <summary>Detalhes</summary>
        <p>
          <strong>Motivo:</strong> {MOTIVO_LABEL[r.motivo_categoria]}
          {r.motivo_detalhe ? ` — ${r.motivo_detalhe}` : ''}
        </p>
        {r.comentario_aprovador && (
          <p>
            <strong>Comentário do aprovador:</strong> {r.comentario_aprovador}
          </p>
        )}
        {r.decidido_em && <p>Decidido em {formatarData(r.decidido_em)}</p>}
      </details>
      {acoes}
    </div>
  )
}
