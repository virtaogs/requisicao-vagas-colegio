import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthContext'
import RequisicaoCard from '../components/RequisicaoCard'
import { MOTIVO_LABEL, URGENCIA_LABEL, type MotivoCategoria, type Requisicao, type Urgencia } from '../lib/types'

export default function SolicitantePage() {
  const { perfil } = useAuth()
  const [aba, setAba] = useState<'nova' | 'minhas'>('nova')
  const [minhas, setMinhas] = useState<Requisicao[]>([])
  const [carregando, setCarregando] = useState(false)

  const [cargo, setCargo] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [motivo, setMotivo] = useState<MotivoCategoria>('aumento_quadro')
  const [detalhe, setDetalhe] = useState('')
  const [urgencia, setUrgencia] = useState<Urgencia>('normal')
  const [prazo, setPrazo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function carregarMinhas() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('requisicoes')
      .select('*')
      .order('criado_em', { ascending: false })
    if (error) {
      console.error(error)
    } else {
      setMinhas((data as Requisicao[]) ?? [])
    }
    setCarregando(false)
  }

  useEffect(() => {
    if (aba === 'minhas') carregarMinhas()
  }, [aba])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setSucesso(false)

    if (!cargo.trim()) {
      setErro('Informe o cargo/função.')
      return
    }
    if (urgencia === 'com_prazo' && !prazo) {
      setErro('Informe o prazo desejado.')
      return
    }

    setEnviando(true)
    const { error } = await supabase.from('requisicoes').insert({
      cargo: cargo.trim(),
      quantidade_solicitada: quantidade,
      motivo_categoria: motivo,
      motivo_detalhe: detalhe.trim() || null,
      urgencia,
      prazo: urgencia === 'com_prazo' ? prazo : null,
      // unidade e solicitante_id são preenchidos no servidor (trigger), mas o
      // insert exige NOT NULL — mandamos a unidade do perfil como valor inicial.
      unidade: perfil?.unidade,
    })
    setEnviando(false)

    if (error) {
      setErro(error.message)
      return
    }

    setSucesso(true)
    setCargo('')
    setQuantidade(1)
    setMotivo('aumento_quadro')
    setDetalhe('')
    setUrgencia('normal')
    setPrazo('')
  }

  return (
    <div className="pagina">
      <div className="cartao-titulo">
        <h2>Requisição de Vagas — {perfil?.unidade}</h2>
      </div>

      <div className="abas">
        <button className={aba === 'nova' ? 'ativa' : ''} onClick={() => setAba('nova')}>
          Nova Requisição
        </button>
        <button className={aba === 'minhas' ? 'ativa' : ''} onClick={() => setAba('minhas')}>
          Minhas Requisições
        </button>
      </div>

      {aba === 'nova' && (
        <div className="cartao">
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Cargo/função
              <input value={cargo} onChange={(e) => setCargo(e.target.value)} required />
            </label>

            <div className="form-linha">
              <label>
                Quantidade de posições
                <input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  required
                />
              </label>

              <label>
                Motivo da vaga
                <select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoCategoria)}>
                  {Object.entries(MOTIVO_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Urgência
                <select value={urgencia} onChange={(e) => setUrgencia(e.target.value as Urgencia)}>
                  {Object.entries(URGENCIA_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {urgencia === 'com_prazo' && (
              <label>
                Prazo desejado
                <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} required />
              </label>
            )}

            <label>
              Detalhe do motivo (opcional)
              <textarea rows={3} value={detalhe} onChange={(e) => setDetalhe(e.target.value)} />
            </label>

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p style={{ color: 'var(--cor-sucesso)' }}>Requisição enviada! Franco vai avaliar em breve.</p>}

            <button type="submit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar requisição'}
            </button>
          </form>
        </div>
      )}

      {aba === 'minhas' && (
        <div className="pagina">
          {carregando && <p className="mensagem-vazia">Carregando…</p>}
          {!carregando && minhas.length === 0 && (
            <p className="mensagem-vazia">Você ainda não enviou nenhuma requisição.</p>
          )}
          {minhas.map((r) => (
            <RequisicaoCard key={r.id} requisicao={r} />
          ))}
        </div>
      )}
    </div>
  )
}
