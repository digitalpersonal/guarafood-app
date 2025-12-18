# 🚀 Checklist de Produção: GuaraFood

## 1. Deploy das Funções (OBRIGATÓRIO PARA O PIX FUNCIONAR)
Para que as regras de "não imprimir Pix pendente" funcionem, você **DEVE** rodar estes comandos no seu terminal:

```bash
npx supabase functions deploy create-payment --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy payment-webhook --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy create-restaurant-with-user --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy delete-restaurant-and-user --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
```
**Nota:** Sem rodar os comandos acima, o sistema continuará usando a versão antiga das funções no servidor.

## 2. SQL de Segurança (Evita erros de status)
Se os pedidos Pix ainda estiverem aparecendo, rode este comando no **SQL Editor** do Supabase para forçar o comportamento correto no banco:

```sql
-- Garante que novos pedidos sem status definido fiquem ocultos por padrão
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'Aguardando Pagamento';
-- Atualiza o esquema
NOTIFY pgrst, 'reload schema';
```

## 3. Configurar Segredos
```bash
npx supabase secrets set SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE_AQUI --project-ref xfousvlrhinlvrpryscy
```