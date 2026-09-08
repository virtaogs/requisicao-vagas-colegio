-- =====================================================================
-- APP REQUISIÇÃO DE VAGAS — Colégio Atitude
-- 05_renomear_fabiane.sql
-- Corrige o nome "Fabiana" -> "Fabiane" (login e nome exibido).
-- Rode uma vez no SQL Editor.
-- =====================================================================

update auth.users
set email = 'fabiane@colegioatitude.local'
where email = 'fabiana@colegioatitude.local';

update auth.identities
set identity_data = jsonb_set(identity_data, '{email}', '"fabiane@colegioatitude.local"')
where user_id = (select id from auth.users where email = 'fabiane@colegioatitude.local');

update public.usuarios_app
set nome = 'Fabiane'
where nome = 'Fabiana';

-- A partir de agora, o login dela é "fabiane" (mesma senha de antes).
