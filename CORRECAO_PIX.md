
# 🔧 Correção do Pix Automático (Atualizado)

Houve uma atualização de segurança no Supabase CLI que impede o uso de variáveis começando com "SUPABASE_". Por isso, mudamos o nome da chave.

## Passo Único: Configurar a Chave Secreta

1.  Acesse o **Supabase Dashboard** (https://supabase.com/dashboard).
2.  Entre no seu projeto (`xfousvlrhinlvrpryscy`).
3.  Vá em **Settings** (ícone de engrenagem) > **API**.
4.  Role até encontrar a seção **Project API keys**.
5.  Copie a chave chamada `service_role` (é a chave secreta, **NÃO** a anon/public).
    *   *Dica: Ela começa com `ey...` e é longa.*

6.  Abra seu terminal na pasta do projeto e rode **EXATAMENTE** este comando (substitua `SUA_CHAVE_SERVICE_ROLE_AQUI` pela chave que copiou):

    ```bash
    npx supabase secrets set SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE_AQUI --project-ref xfousvlrhinlvrpryscy
    ```

    *Exemplo:* `npx supabase secrets set SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR... --project-ref xfousvlrhinlvrpryscy`

## Passo 2: Re-deploy das Funções (Necessário)

Como mudamos o código para procurar a nova chave, você precisa enviar o código atualizado:

```bash
npx supabase functions deploy create-payment --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy payment-webhook --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy create-restaurant-with-user --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy delete-restaurant-and-user --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
```

Agora o Pix vai funcionar!
