# App Requisição de Vagas — Colégio Atitude

Fluxo: Alaiane (Bosque) e Fabiana (Horto) solicitam vaga → Franco aprova ou
rejeita → Victor (RH) acompanha tudo num Kanban e usa as aprovadas como
ponto de partida da triagem.

- **Frontend**: React + Vite (TypeScript), hospedado no GitHub Pages.
- **Backend**: Supabase (Postgres + Auth + Row Level Security).
- **Papéis**: solicitante (Alaiane/Fabiana), aprovador (Franco), RH
  (Victor) — cada um só acessa o que a policy do banco libera, não é uma
  trava só de tela.
- **Login**: por usuário simples (ex.: `alaiane`), convertido internamente
  para um e-mail sintético só para o Supabase Auth entender — nunca
  exibido.

## Estrutura do repositório

```
sql/    scripts SQL, na ordem em que devem ser rodados (veja abaixo)
web/    o app React/Vite
.github/workflows/   deploy automático + keep-alive do Supabase
```

## 1. Criar o projeto no Supabase

1. [supabase.com](https://supabase.com) → crie conta/organização (pode
   usar a mesma organização do App Horas Extras).
2. **New project** → nome (ex: `requisicao-vagas-colegio`), senha do banco
   (guarde — não é possível ver de novo depois) e região (São Paulo/
   `sa-east-1`, se disponível).
3. Aguarde o provisionamento.
4. No menu lateral: **SQL Editor**.

## 2. Rodar os scripts SQL, nesta ordem

Cada um é uma **nova query** no SQL Editor, colar tudo e **Run**.

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | [sql/01_schema_rls.sql](sql/01_schema_rls.sql) | Tabelas, índices, constraints, triggers e todas as policies de RLS. |
| 2 | [sql/02_criar_usuarios_reais.sql.example](sql/02_criar_usuarios_reais.sql.example) | Cria o login e o vínculo de papel das 4 pessoas (Alaiane, Fabiana, Franco, Victor). |

Copie `sql/02_criar_usuarios_reais.sql.example` para
`sql/02_PRIVADO_criar_usuarios_reais.sql` (esse nome com `_PRIVADO_` fica
de fora do git — veja `.gitignore` — pra nunca subir senha em texto puro
pro GitHub), troque as 4 senhas de exemplo e rode esse arquivo no SQL
Editor.

Depois de rodar, cada pessoa já pode logar no app digitando só o usuário
(`alaiane`, `fabiana`, `franco` ou `victor`) e a senha que você definiu.

## 3. Publicar no GitHub Pages

1. Crie um repositório no GitHub (público — Pages grátis exige isso).
2. `cd web && npm install`
3. Copie `web/.env.example` para `web/.env.production` e preencha
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do seu projeto (Supabase
   → Project Settings → API). A anon key não é secreta (é protegida pelo
   RLS), então fica num arquivo comitado — é assim que o App Horas Extras
   também foi feito.
4. No GitHub: **Settings → Pages → Source: GitHub Actions**.
5. O workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
   já builda e publica a cada push na `main`. Ajuste o `BASE_PATH` nele
   para `/<nome-do-repositório>/` (hoje está `/requisicao-vagas-colegio/`).
6. Primeiro push → aba **Actions** do GitHub mostra o deploy rodando. A
   URL final fica em **Settings → Pages**.

## 4. Testar localmente antes de publicar

Precisa do Node.js instalado (baixe em [nodejs.org](https://nodejs.org) se
não tiver — mesma dependência que o App Horas Extras já usa).

```bash
cd web
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev
```

## 5. Keep-alive do plano gratuito

Projetos gratuitos do Supabase pausam depois de ~7 dias sem atividade. O
workflow [.github/workflows/keep-alive.yml](.github/workflows/keep-alive.yml)
faz uma consulta simples a cada 5 dias pra evitar isso.

Configure os secrets do repositório (**Settings → Secrets and variables →
Actions**):
- `SUPABASE_URL`: a URL do seu projeto.
- `SUPABASE_ANON_KEY`: a anon key.

## Estrutura de dados e RLS

- **Tabelas**: `usuarios_app` (vínculo login ↔ papel/unidade) e
  `requisicoes`.
- **Funções auxiliares** (`is_rh`, `is_aprovador`, `get_solicitante_id`,
  `get_minha_unidade`): `SECURITY DEFINER`, respondem "quem é esse
  usuário" sem cair em recursão de RLS. Toda policy usa essas funções.
- **Solicitante**: só lê/insere as próprias requisições. O trigger de
  insert trava `solicitante_id`/`unidade` a partir de quem está logado —
  mesmo que alguém tente mandar outra unidade pela API, o servidor
  ignora e usa a unidade cadastrada da pessoa.
- **Aprovador**: só decide requisições `pendente`, e só pode virar
  `aprovada` ou `rejeitada`. Comentário é obrigatório para rejeitar
  (constraint no banco, não só na tela). Quantidade aprovada pode ser
  menor que a solicitada (aprovação parcial).
- **RH**: só avança `aprovada → em_triagem → preenchida`. Qualquer outra
  transição de status é barrada no servidor (trigger), não só escondida
  na tela.
- **Sem policy de `DELETE`** em nenhuma tabela: por padrão o Postgres
  nega.

## Limitações conhecidas / próximos passos

- Redefinição de senha é manual, pelo RH, via Supabase Dashboard →
  Authentication → Users (login é por usuário simples, não há e-mail real
  cadastrado).
- Exportação é em CSV (abre direto no Excel); se precisar de `.xlsx` com
  formatação, dá pra trocar depois.
- Notificação automática (e-mail) quando Franco decide não está incluída
  — hoje quem solicitou precisa checar a aba "Minhas Requisições".
