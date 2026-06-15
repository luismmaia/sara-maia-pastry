# Pôr online no Render (passo a passo)

> Vais precisar de criar contas tuas. Eu não posso criar contas nem introduzir credenciais por ti —
> mas o processo abaixo é direto.

## 1. Contas a criar (uma vez)
1. **GitHub** (github.com) — para guardar o código.
2. **Render** (render.com) — alojamento + base de dados.
3. **Stripe** (dashboard.stripe.com) — pagamentos. Ativa MB WAY, Revolut Pay, Apple/Google Pay em
   *Settings → Payment methods*. Apple/Google Pay funcionam automaticamente com o Payment Element.
4. **Vendus** — já tens. Em *Definições → API* gera uma **API key**.
5. **Resend** (resend.com) — emails. Cria uma API key e valida o teu domínio de email (opcional no início).

## 2. Pôr o código no GitHub
- Cria um repositório novo (ex.: `sara-maia-pastry`).
- Faz upload desta pasta para esse repositório (pela interface do GitHub ou com `git push`).

## 3. Criar o serviço no Render (via blueprint)
- No Render: **New → Blueprint** e seleciona o teu repositório.
- O Render lê o `render.yaml` e cria **a app web no plano Free**.
- Este blueprint **não** cria base de dados (para nunca criar uma paga sem querer).

## 3b. Base de dados grátis (escolhe uma)
**Opção recomendada — Neon (grátis e permanente, sem cartão):**
1. Cria conta em **neon.com**, cria um projeto.
2. Copia a **connection string** (`postgresql://...`).
3. Cola-a na variável `DATABASE_URL` do serviço web no Render (passo 4).

**Alternativa — Postgres Free do Render (apaga aos 30 dias):**
1. **New → Postgres**, escolhe o tier **Free**, cria.
2. Copia a **Internal Database URL** e cola em `DATABASE_URL` no serviço web.

## 4. Variáveis de ambiente (no painel do serviço web, em *Environment*)
Preenche estas com os **teus** valores:
```
DATABASE_URL                       = postgresql://... (do Neon ou do Postgres Free do Render)
STRIPE_SECRET_KEY                  = sk_live_... (ou sk_test_... para testes)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_... (ou pk_test_...)
STRIPE_WEBHOOK_SECRET              = whsec_... (ver passo 6)
VENDUS_API_KEY                     = a tua key do Vendus (vazio = faturação manual)
RESEND_API_KEY                     = a tua key do Resend (vazio = sem emails)
EMAIL_FROM                         = Sara Maia Pastry <encomendas@oteudominio.pt>
EMAIL_OWNER                        = onde queres receber aviso de nova encomenda
ADMIN_PASSWORD                     = palavra-passe do backoffice
NEXT_PUBLIC_SITE_URL               = https://o-teu-dominio (ou o URL .onrender.com)
```
`AUTH_SECRET` é gerado pelo Render automaticamente.
Para **só testar o design**, basta `DATABASE_URL` e `ADMIN_PASSWORD`; o resto pode ficar vazio.

## 5. Primeiro arranque
- O `build` sincroniza a base de dados com o modelo sozinho (`prisma db push`).
- Para meter os dados de exemplo uma vez: no Render abre a **Shell** do serviço e corre `npm run seed`.
- Abre o site no URL `.onrender.com`. O backoffice está em `/admin`.

## 6. Ligar o webhook do Stripe (importante!)
1. No Stripe: **Developers → Webhooks → Add endpoint**.
2. URL: `https://o-teu-site/api/stripe/webhook`
3. Evento: `payment_intent.succeeded`
4. Copia o **Signing secret** (`whsec_...`) para a variável `STRIPE_WEBHOOK_SECRET` no Render e reinicia.
Sem este passo, os pagamentos não são confirmados nem a fatura é emitida.

## 7. Domínio próprio
- Regista `saramaiapastry.pt` (e `.com`) num registrar (ex.: site.pt, dominios.pt).
- No Render: **Settings → Custom Domains**, adiciona o domínio e segue as instruções de DNS.
- Atualiza `NEXT_PUBLIC_SITE_URL` para o domínio final.

## Custos de referência (mensais, +IVA quando aplicável)
- **Fase de testes: 0 €** — app web Render no plano Free + base de dados grátis (Neon)
- Quando abrires ao público: Render Web (Starter) ~7 USD; base de dados Neon tem plano grátis generoso ou pago a partir de ~19 USD; em alternativa Postgres do Render a partir de ~6 USD
- Stripe: só por transação (cartão/MB WAY/Revolut/Apple/Google ≈ 1,5% + 0,25 €)
- Vendus: o teu plano atual (API incluída)
- Resend: grátis até ~3.000 emails/mês
- Domínios: ~25 €/ano (.pt + .com)
