-- =====================================================================
-- APP REQUISIÇÃO DE VAGAS — Colégio Atitude
-- 03_fix_visibilidade_solicitante.sql
-- Corrige a policy de usuarios_app: o aprovador (Franco) também precisa
-- conseguir ver o nome de quem fez cada requisição, não só o RH.
-- Rode uma vez, depois do 01_schema_rls.sql.
-- =====================================================================

drop policy if exists usuarios_app_select on public.usuarios_app;

create policy usuarios_app_select on public.usuarios_app
  for select to authenticated
  using (user_id = auth.uid() or public.is_aprovador(auth.uid()) or public.is_rh(auth.uid()));
