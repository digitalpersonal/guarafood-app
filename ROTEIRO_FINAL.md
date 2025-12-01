
# 🏁 Roteiro Final: Colocando o GuaraFood no Ar

Você já fez a parte mais difícil (GitHub e Vercel). Agora só falta garantir que o "cérebro" (Banco de Dados) esteja vivo.

Siga estes 3 passos simples. Não precisa de terminal (tela preta).

---

## Passo 1: Preparar o Banco de Dados (Obrigatório)
Se você não fizer isso, o site abre mas não salva pedidos.

1.  Acesse o site: [Supabase Dashboard](https://supabase.com/dashboard) e faça login.
2.  Entre no seu projeto (provavelmente o `xfousvlrhinlvrpryscy`).
3.  No menu lateral esquerdo, clique no ícone **SQL Editor** (parece um terminal `>_`).
4.  Clique em **+ New Query**.
5.  **Copie e cole** todo o código do arquivo `supabase/schema.sql` que está no seu projeto (ou peça para a IA gerar novamente se perdeu).
6.  Clique no botão verde **RUN** (no canto inferior direito ou topo).
    *   *Se der sucesso:* Ótimo! As tabelas foram criadas.
    *   *Se aparecer "relation already exists":* Também é ótimo! Significa que já estava pronto.

---

## Passo 2: Configurar o Pix Manual (Contorno do Windows 7)
Como não conseguimos instalar a automação de pagamento via terminal no Windows 7, vamos configurar o modo manual para garantir que você receba.

1.  Abra seu site no link do Vercel (ex: `guarafood.vercel.app`).
2.  Faça login no **Painel do Lojista**.
    *   *Se ainda não criou conta:* Use o formulário de cadastro na tela inicial.
3.  Vá em **Configurações**.
4.  No campo **"Chave Pix Manual"**, digite sua chave (CPF, Email, Celular).
5.  Clique em **Salvar**.

**O que vai acontecer:** Quando o cliente comprar, ele verá sua chave Pix na tela, fará o pagamento no banco dele e clicará em "Já fiz o pagamento". O pedido chegará para você com um som de alerta.

---

## Passo 3: Segurança no Vercel (Recomendado)
Para proteger suas chaves no futuro.

1.  Acesse [Vercel Dashboard](https://vercel.com/dashboard).
2.  Clique no projeto do GuaraFood.
3.  Vá em **Settings** (Configurações) -> **Environment Variables**.
4.  Adicione as chaves:
    *   `VITE_SUPABASE_URL`: (Sua URL do Supabase)
    *   `VITE_SUPABASE_ANON_KEY`: (Sua chave Anon)
5.  Vá na aba **Deployments**, clique nos 3 pontinhos do último deploy e escolha **Redeploy**.

---

**🎉 PRONTO! SEU APLICATIVO ESTÁ FUNCIONAL.**
