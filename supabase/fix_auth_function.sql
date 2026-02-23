-- ==============================================================================
-- SCRIPT DE CORREÇÃO DEFINITIVO: FUNÇÃO SEGURA PARA BUSCAR PERFIL
-- Este script cria uma função RPC com 'SECURITY DEFINER' para buscar o perfil
-- do usuário autenticado. Isso ignora as políticas de RLS para esta consulta
-- específica, quebrando o loop de recursão infinita de uma vez por todas.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS TABLE (id uuid, name text, role text, restaurant_id int)
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.role, p.restaurant_id
  FROM public.profiles AS p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
