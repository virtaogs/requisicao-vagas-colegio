export type Papel = 'solicitante' | 'aprovador' | 'rh'
export type Unidade = 'Bosque' | 'Horto'

export interface MeuPerfil {
  papel: Papel
  id: string
  nome: string
  unidade: Unidade | null
}

export type Status = 'pendente' | 'aprovada' | 'rejeitada' | 'em_triagem' | 'preenchida'
export type MotivoCategoria = 'aumento_quadro' | 'substituicao' | 'nova_unidade_turma' | 'outro'
export type Urgencia = 'normal' | 'urgente' | 'com_prazo'

export const STATUS_LABEL: Record<Status, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  em_triagem: 'Em Triagem',
  preenchida: 'Preenchida',
}

export const STATUS_ORDEM_KANBAN: Status[] = ['pendente', 'aprovada', 'em_triagem', 'preenchida', 'rejeitada']

export const MOTIVO_LABEL: Record<MotivoCategoria, string> = {
  aumento_quadro: 'Aumento de quadro',
  substituicao: 'Substituição',
  nova_unidade_turma: 'Nova unidade/turma',
  outro: 'Outro',
}

export const URGENCIA_LABEL: Record<Urgencia, string> = {
  normal: 'Normal',
  urgente: 'Urgente',
  com_prazo: 'Com prazo',
}

export interface Requisicao {
  id: string
  solicitante_id: string
  unidade: Unidade
  cargo: string
  quantidade_solicitada: number
  quantidade_aprovada: number | null
  motivo_categoria: MotivoCategoria
  motivo_detalhe: string | null
  urgencia: Urgencia
  prazo: string | null
  status: Status
  comentario_aprovador: string | null
  decidido_por: string | null
  decidido_em: string | null
  criado_em: string
  atualizado_em: string
  usuarios_app?: {
    nome: string
  }
}
