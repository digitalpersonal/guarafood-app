# 🔧 Correção do Pix Automático

## Passo 1: Configurar a Chave Secreta
Rode no terminal (substitua pela sua chave service_role):
```bash
npx supabase secrets set SERVICE_ROLE_KEY=SUA_CHAVE_AQUI --project-ref xfousvlrhinlvrpryscy
```

## Passo 2: Re-deploy das Funções (NECESSÁRIO)
**Certifique-se de rodar o comando de deploy das funções (npx supabase functions deploy ...) após estas atualizações para que as mudanças no servidor entrem em vigor.**

```bash
npx supabase functions deploy create-payment --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy payment-webhook --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
```

Sem o deploy, o servidor continuará executando o código antigo que não possui as travas de segurança de status.