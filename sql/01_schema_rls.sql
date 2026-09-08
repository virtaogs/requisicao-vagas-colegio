-- =====================================================================
-- APP REQUISIÇÃO DE VAGAS — Colégio Atitude
-- 01_schema_rls.sql
-- Estrutura de dados + Row Level Security (RLS)
-- Rode este script inteiro no SQL Editor do Supabase (projeto novo, vazio)
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. USUÁRIOS DO APP
-- -----------------------------------------------------------------------
-- Só existem 4 pessoas hoje (Alaiane, Fabiana, Franco, Victor), mas a
-- tabela permite cadastrar mais gente no futuro sem mudar o código.
-- O Supabase Auth só sabe autenticar (auth.users); esta tabela é a ponte
-- que diz "este login é a Alaiane, e ela é solicitante da unidade Bosque".
-- =====================================================================

create table public.usuarios_app (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete restrict,
  nome          text not null,
  papel         text not null check (papel in ('solicitante', 'aprovador', 'rh')),
  unidade       text check (unidade in ('Bosque', 'Horto')),
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint chk_unidade_so_solicitante check (
    (papel = 'solicitante' and unidade is not null) or
    (papel <> 'solicitante' and unidade is null)
  )
);

comment on table public.usuarios_app is 'Vínculo entre login (auth.users) e papel/unidade dentro do app.';

-- =====================================================================
-- 2. REQUISIÇÕES DE VAGA
-- =====================================================================

create table public.requisicoes (
  id                      uuid primary key default gen_random_uuid(),
  solicitante_id          uuid not null references public.usuarios_app(id) on delete restrict,
  unidade                 text not null check (unidade in ('Bosque', 'Horto')),
  cargo                   text not null check (length(trim(cargo)) > 0),
  quantidade_solicitada   integer not null check (quantidade_solicitada > 0),
  quantidade_aprovada     integer check (quantidade_aprovada >= 0),
  motivo_categoria        text not null check (motivo_categoria in (
                             'aumento_quadro', 'substituicao', 'nova_unidade_turma', 'outro'
                           )),
  motivo_detalhe          text,
  urgencia                text not null default 'normal' check (urgencia in ('normal', 'urgente', 'com_prazo')),
  prazo                   date,
  status                  text not null default 'pendente' check (status in (
                             'pendente', 'aprovada', 'rejeitada', 'em_triagem', 'preenchida'
                           )),
  comentario_aprovador    text,
  decidido_por            uuid references auth.users(id),
  decidido_em             timestamptz,
  criado_em               timestamptz not null default now(),
  atualizado_em           timestamptz not null default now(),
  constraint chk_qtd_aprovada_max check (quantidade_aprovada is null or quantidade_aprovada <= quantidade_solicitada),
  constraint chk_comentario_se_rejeitada check (
    status <> 'rejeitada' or (comentario_aprovador is not null and length(trim(comentario_aprovador)) > 0)
  ),
  constraint chk_prazo_se_com_prazo check (urgencia <> 'com_prazo' or prazo is not null)
);

create index idx_requisicoes_solicitante_id on public.requisicoes(solicitante_id);
create index idx_requisicoes_status on public.requisicoes(status);
create index idx_requisicoes_unidade on public.requisicoes(unidade);

comment on column public.requisicoes.motivo_categoria is 'Ajuste os valores do CHECK conforme a realidade do colégio.';

-- =====================================================================
-- 3. updated_at automático
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_usuarios_app_updated_at
  before update on public.usuarios_app
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 4. FUNÇÕES AUXILIARES (SECURITY DEFINER — evitam recursão de RLS)
-- =====================================================================

create or replace function public.is_rh(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios_app u
    where u.user_id = p_user_id and u.papel = 'rh' and u.ativo
  );
$$;

create or replace function public.is_aprovador(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios_app u
    where u.user_id = p_user_id and u.papel = 'aprovador' and u.ativo
  );
$$;

create or replace function public.get_solicitante_id(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.usuarios_app
  where user_id = p_user_id and papel = 'solicitante' and ativo;
$$;

create or replace function public.get_minha_unidade(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select unidade from public.usuarios_app
  where user_id = p_user_id and papel = 'solicitante' and ativo;
$$;

grant execute on function public.is_rh(uuid) to authenticated;
grant execute on function public.is_aprovador(uuid) to authenticated;
grant execute on function public.get_solicitante_id(uuid) to authenticated;
grant execute on function public.get_minha_unidade(uuid) to authenticated;

-- =====================================================================
-- 5. meu_perfil() — o frontend chama isso logo após o login
-- =====================================================================

create or replace function public.meu_perfil()
returns table (
  papel   text,
  id      uuid,
  nome    text,
  unidade text
)
language sql
stable
security definer
set search_path = public
as $$
  select papel, id, nome, unidade
  from public.usuarios_app
  where user_id = auth.uid() and ativo
  limit 1;
$$;

grant execute on function public.meu_perfil() to authenticated;

comment on function public.meu_perfil() is 'Usado pelo frontend logo após o login para decidir qual painel mostrar.';

-- =====================================================================
-- 6. TRIGGERS DE REGRA DE NEGÓCIO EM REQUISICOES
-- =====================================================================

-- Ao inserir: trava solicitante_id/unidade a partir de quem está logado
-- (defesa em profundidade, além da RLS) e força o status inicial.
create or replace function public.trg_requisicoes_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitante_id uuid;
  v_unidade text;
begin
  v_solicitante_id := public.get_solicitante_id(auth.uid());
  v_unidade := public.get_minha_unidade(auth.uid());

  if v_solicitante_id is null then
    raise exception 'Apenas solicitantes podem criar requisições.';
  end if;

  new.solicitante_id := v_solicitante_id;
  new.unidade := v_unidade;
  new.status := 'pendente';
  new.quantidade_aprovada := null;
  new.comentario_aprovador := null;
  new.decidido_por := null;
  new.decidido_em := null;
  new.criado_em := coalesce(new.criado_em, now());
  return new;
end;
$$;

create trigger trg_requisicoes_before_insert
  before insert on public.requisicoes
  for each row execute function public.trg_requisicoes_before_insert();

-- Ao atualizar: só permite as transições de status previstas no fluxo,
-- cada uma feita pelo papel certo. Qualquer outra tentativa é barrada
-- mesmo que alguém contorne a tela e chame a API direto.
create or replace function public.trg_requisicoes_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_aprovador(auth.uid()) then
    if old.status <> 'pendente' then
      raise exception 'Só é possível decidir requisições pendentes.';
    end if;
    if new.status not in ('aprovada', 'rejeitada') then
      raise exception 'Aprovador só pode aprovar ou rejeitar.';
    end if;
    new.decidido_por := auth.uid();
    new.decidido_em := now();
    -- mantém tudo o mais como estava, só aceita as colunas de decisão
    new.solicitante_id := old.solicitante_id;
    new.unidade := old.unidade;
    new.cargo := old.cargo;
    new.quantidade_solicitada := old.quantidade_solicitada;
    new.motivo_categoria := old.motivo_categoria;
    new.motivo_detalhe := old.motivo_detalhe;
    new.urgencia := old.urgencia;
    new.prazo := old.prazo;
    new.criado_em := old.criado_em;
    if new.status = 'rejeitada' then
      new.quantidade_aprovada := null;
    end if;

  elsif public.is_rh(auth.uid()) then
    if not (
      (old.status = 'aprovada' and new.status = 'em_triagem') or
      (old.status = 'em_triagem' and new.status = 'preenchida')
    ) then
      raise exception 'RH só pode avançar Aprovada -> Em Triagem -> Preenchida.';
    end if;
    -- RH só mexe no status; todo o resto fica travado como estava.
    new.solicitante_id := old.solicitante_id;
    new.unidade := old.unidade;
    new.cargo := old.cargo;
    new.quantidade_solicitada := old.quantidade_solicitada;
    new.quantidade_aprovada := old.quantidade_aprovada;
    new.motivo_categoria := old.motivo_categoria;
    new.motivo_detalhe := old.motivo_detalhe;
    new.urgencia := old.urgencia;
    new.prazo := old.prazo;
    new.comentario_aprovador := old.comentario_aprovador;
    new.decidido_por := old.decidido_por;
    new.decidido_em := old.decidido_em;
    new.criado_em := old.criado_em;

  else
    raise exception 'Sem permissão para alterar requisições.';
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_requisicoes_before_update
  before update on public.requisicoes
  for each row execute function public.trg_requisicoes_before_update();

-- =====================================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================================

alter table public.usuarios_app enable row level security;
alter table public.requisicoes  enable row level security;

-- usuarios_app: cada um só vê o próprio vínculo; aprovador e RH veem todo
-- mundo (o aprovador precisa ver o nome de quem pediu cada requisição).
create policy usuarios_app_select on public.usuarios_app
  for select to authenticated
  using (user_id = auth.uid() or public.is_aprovador(auth.uid()) or public.is_rh(auth.uid()));

-- só RH cadastra/edita usuários do app (inclusive contra chamada direta de API)
create policy usuarios_app_insert on public.usuarios_app
  for insert to authenticated
  with check (public.is_rh(auth.uid()));

create policy usuarios_app_update on public.usuarios_app
  for update to authenticated
  using (public.is_rh(auth.uid()))
  with check (public.is_rh(auth.uid()));

-- requisicoes: solicitante só vê as próprias; aprovador e RH veem todas.
create policy requisicoes_select on public.requisicoes
  for select to authenticated
  using (
    solicitante_id = public.get_solicitante_id(auth.uid())
    or public.is_aprovador(auth.uid())
    or public.is_rh(auth.uid())
  );

-- só solicitante insere (o trigger acima trava solicitante_id/unidade certos)
create policy requisicoes_insert on public.requisicoes
  for insert to authenticated
  with check (public.get_solicitante_id(auth.uid()) is not null);

-- aprovador decide pendentes; RH avança o kanban depois de aprovada.
-- As regras finas de QUAL transição é permitida ficam no trigger acima —
-- aqui só garantimos que só esses dois papéis conseguem tentar.
create policy requisicoes_update on public.requisicoes
  for update to authenticated
  using (public.is_aprovador(auth.uid()) or public.is_rh(auth.uid()))
  with check (public.is_aprovador(auth.uid()) or public.is_rh(auth.uid()));

-- sem policy de DELETE em nenhuma tabela: por padrão o Postgres nega.
