# Sara Maia · Pastry — loja online

Aplicação **Next.js** (frontend + backend numa só app), base de dados **PostgreSQL** (Prisma),
pagamentos **Stripe** (cartão, MB WAY, Revolut Pay, Apple Pay, Google Pay), faturação **Vendus**
e emails **Resend**. Bilingue **PT/EN**. Backoffice em `/admin`.

> Estado: **v1 para deploy-e-iterar.** O código está completo nas partes essenciais.
> Como não foi possível executá-lo no ambiente onde foi gerado, corre-o uma vez (local ou Render)
> e reporta qualquer erro para ser corrigido.

## O que já faz
- Montra de bolos com fotos, categorias e PT/EN
- Página de produto com **personalizações que alteram o preço** (tamanho, decoração) e antecedência mínima
- **Dois tipos de stock por produto:**
  - *Por encomenda* — unidades ilimitadas, só limitado pelo tempo de produção e pelos horários
  - *Stock limitado* — número fixo de unidades; mostra "últimas N" e depois "Esgotado"
- **Tempo de produção** imposto no calendário (dias demasiado próximos ficam indisponíveis)
- **Calendário de levantamento por local**, distinguindo dias com/sem horários
- Checkout **convidado ou com conta**, recolha de nome/telemóvel/email e **NIF para fatura**
- Pagamento real via **Stripe Payment Element** (preço calculado no servidor)
- **Webhook** que confirma a encomenda, reserva o horário, emite **fatura Vendus** e envia **emails**
- Backoffice: adicionar/remover produtos, abrir/fechar horários, ver encomendas

## Correr localmente
```bash
npm install
cp .env.example .env        # preenche as variáveis
npx prisma db push          # cria/atualiza as tabelas a partir do schema
npm run seed                # dados de exemplo (opcional)
npm run dev                 # http://localhost:3000  ·  backoffice em /admin
```

## Estrutura
- `prisma/schema.prisma` — modelo de dados
- `src/app/api/*` — backend (público + `/admin` protegido)
- `src/components/Storefront.tsx` — montra + checkout
- `src/app/admin/page.tsx` — backoffice

## O que ainda vale a pena evoluir (fase 2)
- Upload de fotos (em vez de colar URL) — ligar a um storage
- Editar opções/fotos de cada produto no backoffice (agora cria com tamanhos por defeito)
- Contas de cliente com login e histórico (modelo `User` já existe)
- Multibanco com referência (opcional)
- Confirmar campos exatos da API Vendus para o teu plano
