-- =====================================================================
-- APP REQUISIÇÃO DE VAGAS — Colégio Atitude
-- 04_limpar_dados_teste.sql
-- Apaga a(s) requisição(ões) de teste criada(s) durante a configuração
-- do app, antes de todo mundo começar a usar de verdade.
-- =====================================================================

delete from public.requisicoes
where cargo = 'Professor de Matemática'
  and status = 'rejeitada';
