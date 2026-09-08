// Login é feito digitando só o "usuário" (ex.: alaiane) — internamente vira
// um e-mail sintético só pro Supabase Auth entender. Nunca exibido.
const DOMINIO = 'colegioatitude.local'

export function usuarioParaEmailLogin(usuario: string): string {
  return `${usuario.trim().toLowerCase()}@${DOMINIO}`
}
