
# 🏁 Roteiro Final: Colocando o GuaraFood no Ar

## Passo 1: Preparar o Banco de Dados
Acesse o [Supabase Dashboard](https://supabase.com/dashboard), vá em **SQL Editor** e rode o script inicial (`schema.sql`).

## Passo 2: Publicar as Funções (CRÍTICO)
No seu terminal, rode:
```bash
npx supabase functions deploy create-payment --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy payment-webhook --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy create-restaurant-with-user --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
```

## Passo 3: Configurações Adicionais
No painel de cada lojista, em **Configurações**, preencha a **Chave Pix Manual**. Isso serve como segurança caso a automação do Mercado Pago falhe ou não esteja configurada.
