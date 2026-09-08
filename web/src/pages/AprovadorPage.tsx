import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import RequisicaoCard from '../components/RequisicaoCard'
import { MOTIVO_LABEL, URGENCIA_LABEL, type Requisicao } from '../lib/types'

function CartaoDecisao({ requisicao, onDecidido }: { requisicao: Requisicao; onDecidido: () => void }) {
  const r = requisicao
  const [qtdAprovada, setQtdAprovada] = useState(r.quantidade_solicitada)
  const [comentario, setComentario] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function decidir(aprovado: boolean) {
    setErro(null)
    if (!aprovado && !comentario.trim()) {
      setErro('Informe um comentário explicando a rejeição.')
      return
    }
    setEnviando(true)
    const { error } = await supabase
      .from('requisicoes')
      .update({
        status: aprovado ? 'aprovada' : 'rejeitada',
        quantidade_aprovada: aprovado ? qtdAprovada : null,
        comentario_aprovador: comentario.trim() || null,
      })
      .eq('id', r.id)
    setEnviando(false)
    if (error) {
      setErro(error.message)
      return
    }
    onDecidido()
  }

  return (
    <div className="requisicao-card">
      <div className="cartao-titulo" style={{ marginBottom: 0 }}>
        <h4>{r.cargo}</h4>
      </div>
      <div className="meta">
        {r.unidade} · {r.quantidade_solicitada} posição(ões) · solicitado por {r.usuarios_app?.nome ?? '—'}
      </div>
      <div className="meta">
        <strong>Motivo:</strong> {MOTIVO_LABEL[r.motivo_categoria]}
        {r.motivo_detalhe ? ` — ${r.motivo_detalhe}` : ''}
      </div>
      {r.urgencia !== 'normal' && (
        <span className="badge-urgencia">
          {URGENCIA_LABEL[r.urgencia]}
          {r.prazo ? ` (prazo: ${new Date(r.prazo).toLocaleDateString('pt-BR')})` : ''}
        </span>
      )}

      <div className="acoes-aprovacao">
        <label>
          Quantidade aprovada
          <input
            type="number"
            min={0}
            max={r.quantidade_solicitada}
            value={qtdAprovada}
            onChange={(e) => setQtdAprovada(Number(e.target.value))}
          />
        </label>
        <label>
          Comentário (obrigatório se rejeitar)
          <textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <div className="linha-botoes">
          <button className="btn-aprovar" disabled={enviando} onClick={() => decidir(true)}>
            ✅ Aprovar
          </button>
          <button className="btn-rejeitar" disabled={enviando} onClick={() => decidir(false)}>
            ❌ Rejeitar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AprovadorPage() {
  const [pendentes, setPendentes] = useState<Requisicao[]>([])
  const [decididas, setDecididas] = useState<Requisicao[]>([])
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('requisicoes')
      .select('*, usuarios_app(nome)')
      .order('criado_em', { ascending: true })

    if (error) {
      console.error(error)
      setCarregando(false)
      return
    }

    const todas = (data as Requisicao[]) ?? []
    setPendentes(todas.filter((r) => r.status === 'pendente'))
    setDecididas(
      todas
        .filter((r) => r.status !== 'pendente')
        .sort((a, b) => (b.decidido_em ?? '').localeCompare(a.decidido_em ?? '')),
    )
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  return (
    <div className="pagina">
      <div className="cartao-titulo">
        <h2>✅ Aprovação de Vagas</h2>
      </div>

      <div>
        <h3>Pendentes ({pendentes.length})</h3>
        {carregando && <p className="mensagem-vazia">Carregando…</p>}
        {!carregando && pendentes.length === 0 && <p className="mensagem-vazia">Nenhuma requisição pendente. 🎉</p>}
        <div className="pagina">
          {pendentes.map((r) => (
            <CartaoDecisao key={r.id} requisicao={r} onDecidido={carregar} />
          ))}
        </div>
      </div>

      <div>
        <h3>Histórico de decisões</h3>
        {!carregando && decididas.length === 0 && <p className="mensagem-vazia">Nenhuma decisão registrada ainda.</p>}
        <div className="pagina">
          {decididas.map((r) => (
            <RequisicaoCard key={r.id} requisicao={r} mostrarSolicitante />
          ))}
        </div>
      </div>
    </div>
  )
}
