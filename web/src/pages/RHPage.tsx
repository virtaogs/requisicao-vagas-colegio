import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import RequisicaoCard from '../components/RequisicaoCard'
import {
  MOTIVO_LABEL,
  STATUS_LABEL,
  STATUS_ORDEM_KANBAN,
  type Requisicao,
  type Status,
  type Unidade,
} from '../lib/types'

function baixarCsv(linhas: Requisicao[]) {
  const cabecalho = [
    'Cargo',
    'Unidade',
    'Solicitante',
    'Quantidade Solicitada',
    'Quantidade Aprovada',
    'Motivo',
    'Urgência',
    'Prazo',
    'Status',
    'Comentário Aprovador',
    'Criado Em',
    'Decidido Em',
  ]
  const linhasCsv = linhas.map((r) => [
    r.cargo,
    r.unidade,
    r.usuarios_app?.nome ?? '',
    r.quantidade_solicitada,
    r.quantidade_aprovada ?? '',
    MOTIVO_LABEL[r.motivo_categoria],
    r.urgencia,
    r.prazo ?? '',
    STATUS_LABEL[r.status],
    (r.comentario_aprovador ?? '').replaceAll('\n', ' '),
    r.criado_em,
    r.decidido_em ?? '',
  ])
  const csv = [cabecalho, ...linhasCsv]
    .map((linha) => linha.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(';'))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `requisicoes_vagas_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function RHPage() {
  const [aba, setAba] = useState<'kanban' | 'dashboard' | 'historico'>('kanban')
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroUnidade, setFiltroUnidade] = useState<Unidade | ''>('')
  const [filtroStatus, setFiltroStatus] = useState<Status | ''>('')

  async function carregar() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('requisicoes')
      .select('*, usuarios_app(nome)')
      .order('criado_em', { ascending: false })
    if (error) {
      console.error(error)
    } else {
      setRequisicoes((data as Requisicao[]) ?? [])
    }
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function avancarStatus(id: string, novoStatus: Status) {
    const { error } = await supabase.from('requisicoes').update({ status: novoStatus }).eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    carregar()
  }

  const contagemPorStatus = useMemo(() => {
    const mapa: Record<Status, number> = { pendente: 0, aprovada: 0, rejeitada: 0, em_triagem: 0, preenchida: 0 }
    for (const r of requisicoes) mapa[r.status]++
    return mapa
  }, [requisicoes])

  const requisicoesKanban = useMemo(
    () => (filtroUnidade ? requisicoes.filter((r) => r.unidade === filtroUnidade) : requisicoes),
    [requisicoes, filtroUnidade],
  )

  const requisicoesFiltradas = useMemo(() => {
    return requisicoes.filter(
      (r) => (!filtroUnidade || r.unidade === filtroUnidade) && (!filtroStatus || r.status === filtroStatus),
    )
  }, [requisicoes, filtroUnidade, filtroStatus])

  const porUnidade = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const r of requisicoes) mapa[r.unidade] = (mapa[r.unidade] ?? 0) + 1
    return mapa
  }, [requisicoes])

  const porSolicitante = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const r of requisicoes) {
      const nome = r.usuarios_app?.nome ?? 'Desconhecido'
      mapa[nome] = (mapa[nome] ?? 0) + 1
    }
    return mapa
  }, [requisicoes])

  return (
    <div className="pagina">
      <div className="cartao-titulo">
        <h2>📊 Visão Geral — RH</h2>
      </div>

      <div className="metricas">
        {STATUS_ORDEM_KANBAN.map((status) => (
          <div className="metrica" key={status}>
            <div className="valor">{contagemPorStatus[status]}</div>
            <div className="rotulo">{STATUS_LABEL[status]}</div>
          </div>
        ))}
      </div>

      <div className="abas">
        <button className={aba === 'kanban' ? 'ativa' : ''} onClick={() => setAba('kanban')}>
          🗂️ Kanban
        </button>
        <button className={aba === 'dashboard' ? 'ativa' : ''} onClick={() => setAba('dashboard')}>
          📈 Dashboard
        </button>
        <button className={aba === 'historico' ? 'ativa' : ''} onClick={() => setAba('historico')}>
          🕑 Histórico completo
        </button>
      </div>

      {carregando && <p className="mensagem-vazia">Carregando…</p>}

      {!carregando && aba === 'kanban' && (
        <div className="pagina">
          <div className="filtros">
            <label>
              Filtrar por unidade
              <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value as Unidade | '')}>
                <option value="">Todas</option>
                <option value="Bosque">Bosque</option>
                <option value="Horto">Horto</option>
              </select>
            </label>
          </div>

          <div className="kanban">
            {STATUS_ORDEM_KANBAN.map((status) => (
              <div className="kanban-coluna" key={status}>
                <div className="kanban-coluna-titulo">
                  {STATUS_LABEL[status]} ({requisicoesKanban.filter((r) => r.status === status).length})
                </div>
                {requisicoesKanban
                  .filter((r) => r.status === status)
                  .map((r) => (
                    <RequisicaoCard
                      key={r.id}
                      requisicao={r}
                      mostrarSolicitante
                      acoes={
                        status === 'aprovada' ? (
                          <button className="btn-avancar" onClick={() => avancarStatus(r.id, 'em_triagem')}>
                            ▶️ Iniciar triagem
                          </button>
                        ) : status === 'em_triagem' ? (
                          <button className="btn-avancar" onClick={() => avancarStatus(r.id, 'preenchida')}>
                            ✅ Marcar preenchida
                          </button>
                        ) : undefined
                      }
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {!carregando && aba === 'dashboard' && (
        <div className="pagina">
          <div className="cartao">
            <h3>Requisições por unidade</h3>
            {Object.entries(porUnidade).map(([unidade, qtd]) => (
              <div key={unidade} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
                <span>{unidade}</span>
                <strong>{qtd}</strong>
              </div>
            ))}
          </div>
          <div className="cartao">
            <h3>Requisições por solicitante</h3>
            {Object.entries(porSolicitante).map(([nome, qtd]) => (
              <div key={nome} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
                <span>{nome}</span>
                <strong>{qtd}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {!carregando && aba === 'historico' && (
        <div className="pagina">
          <div className="filtros">
            <label>
              Unidade
              <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value as Unidade | '')}>
                <option value="">Todas</option>
                <option value="Bosque">Bosque</option>
                <option value="Horto">Horto</option>
              </select>
            </label>
            <label>
              Status
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as Status | '')}>
                <option value="">Todos</option>
                {STATUS_ORDEM_KANBAN.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => baixarCsv(requisicoesFiltradas)}>⬇️ Exportar CSV</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Cargo</th>
                <th>Unidade</th>
                <th>Solicitante</th>
                <th>Qtd.</th>
                <th>Status</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {requisicoesFiltradas.map((r) => (
                <tr key={r.id}>
                  <td>{r.cargo}</td>
                  <td>{r.unidade}</td>
                  <td>{r.usuarios_app?.nome ?? '—'}</td>
                  <td>
                    {r.quantidade_solicitada}
                    {r.quantidade_aprovada != null ? ` (aprov.: ${r.quantidade_aprovada})` : ''}
                  </td>
                  <td>
                    <span className={`badge-status ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                  <td>{new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {requisicoesFiltradas.length === 0 && <p className="mensagem-vazia">Nenhuma requisição encontrada.</p>}
        </div>
      )}
    </div>
  )
}
