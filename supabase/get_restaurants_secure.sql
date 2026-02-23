-- ==============================================================================
-- SCRIPT DE CORREÇÃO FINAL: FUNÇÃO SEGURA PARA BUSCAR RESTAURANTES
-- Esta função usa 'SECURITY DEFINER' para buscar todos os restaurantes, 
-- evitando o erro de recursão da RLS que ocorre com a consulta direta.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_restaurants_secure()
RETURNS SETOF restaurants AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.restaurants;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
