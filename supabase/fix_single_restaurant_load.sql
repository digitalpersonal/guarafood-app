-- ==============================================================================
-- SCRIPT DE CORREÇÃO FINAL E DEFINITIVO (v4)
-- Causa Raiz: A função que busca os detalhes de um ÚNICO restaurante para o admin
-- ainda usava uma consulta direta, causando o erro de recursão.
--
-- Solução: Criar uma função com 'SECURITY DEFINER' para buscar um restaurante
-- específico pelo seu ID. Isso quebra o ciclo de recursão de forma definitiva.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_restaurant_by_id_secure(p_id INT)
RETURNS SETOF restaurants AS $$
BEGIN
  -- Esta consulta é executada com privilégios elevados, ignorando a RLS.
  RETURN QUERY
  SELECT * FROM public.restaurants WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
