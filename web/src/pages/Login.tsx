import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { usuarioParaEmailLogin } from '../lib/usuario'

export default function Login() {
  const { signIn } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!usuario.trim() || !senha) {
      setErro('Preencha usuário e senha.')
      return
    }

    setEnviando(true)
    const msg = await signIn(usuarioParaEmailLogin(usuario), senha)
    setEnviando(false)
    if (msg) setErro('Usuário ou senha incorretos.')
  }

  return (
    <div className="tela-login">
      <form className="cartao" onSubmit={handleSubmit}>
        <h1>Requisição de Vagas</h1>
        <p className="subtitulo">Colégio Atitude</p>

        <label>
          Usuário
          <input
            type="text"
            placeholder="ex.: alaiane"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            autoFocus
            autoCapitalize="off"
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>

        {erro && <p className="erro">{erro}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="nota-login">Esqueceu a senha? Procure o RH para redefinir.</p>
      </form>
    </div>
  )
}
