# War Room · Evino e-commerce

Dash de acompanhamento comercial, growth e CRM do e-commerce Evino, com abas **Hoje**, **Ontem** e **Mês até ontem**. É a versão para a Vercel do dash que nasceu no Claude: mesmo layout e mesmos cálculos, mas os dados vêm direto das fontes, sem passar pelos conectores do Claude.

## Como funciona

```
public/        página estática (index.html, data.js, fonts.css, runtime.js)
api/data.js    função serverless: GET /api/data?id=<fonte>&<parâmetros>
lib/           acesso às fontes (Redshift, Google Sheets, Meta Ads, Insider One)
```

- `public/runtime.js` faz o papel do runtime de dashboards do Claude: busca cada fonte em `/api/data`, roda os cálculos de `data.js` e redesenha os blocos. Atualiza sozinho a cada 5 minutos com a aba aberta.
- `api/data.js` valida os parâmetros, consulta a fonte e guarda o resultado em memória por 3 minutos (Hoje) ou 30 minutos (dias fechados).

| Fonte | O que alimenta | Onde está |
|---|---|---|
| Redshift | vendas, pedidos, kits, hora a hora, faixas, canal × SKU, último clique | `lib/redshift-sources.js` |
| Google Sheets | Monitoramento de Canais (receita LC, metas, investimento) e Plano de Vendas do mês | `lib/sheets-sources.js` |
| Meta Ads (Marketing API) | gasto, impressões, cliques e compras por anúncio; série diária | `lib/meta-sources.js` |
| Insider One (APIs de relatório) | resumo de e-mail e WhatsApp, campanhas de e-mail (envios e abertura) | `lib/insider-sources.js` |

### Tabelas do Redshift

| Uso | Tabela padrão | Variável para trocar |
|---|---|---|
| Pedidos × item | `dora_red_aggregations.ev_fact_order_item` | `T_FACT_ORDER_ITEM` |
| Último clique | `dora_red_aggregations.ev_last_click_full` | `T_LAST_CLICK` |
| Kits | `dora_red_aggregations.vw_ev_dim_product_bundle` | `T_DIM_BUNDLE` |
| Grupo de produto (faixas) | `dora_red_aggregations.ev_grupo_de_produto` | `T_GRUPO_PRODUTO` |
| Produto | `dora_red_aggregations.ev_dim_product` | `T_DIM_PRODUCT` |

São as tabelas de origem das views do Dados Víssimo (registro do ETL). As colunas usadas são as mesmas das views; se alguma tiver outro nome no Redshift, o erro aparece na própria tela e nos logs da função.

**Permissões:** o usuário do Redshift precisa de `SELECT` nessas tabelas. As views `vissimo_bi.*` e `vw_carga_*` exigem permissão extra, por isso o padrão usa as tabelas de origem. Sem permissão em `vw_ev_dim_product_bundle`, o dash continua funcionando, só sem nome e estoque dos kits (as outras tabelas de kits do Redshift pararam em 2023). Para liberar: `GRANT SELECT ON dora_red_aggregations.vw_ev_dim_product_bundle TO <usuário>;`

**Fontes com erro:** se uma fonte falha (token da Meta vencido, planilha sem acesso, chave do Insider inválida), cada bloco mostra o que der com as outras fontes e só exibe o erro quando não sobra nada para mostrar.

## Conceitos de receita

- **Ontem e Mês até ontem:** pedidos pagos (`is_paid = 1`), receita = `price_to_pay + item_shipping_amount`.
- **Hoje:** boleto condition — pedidos solid (`is_solid = 1`, pagos ou não), sem SAC, televendas (cupom `TV*`), ItaúShop (pedido `BRI*`) e Vivino; receita, frete e CM2 de boleto a 65% e PIX a 75%. PMV sem o fator.
- **Receita last click por canal, metas e investimento:** planilha Monitoramento de Canais.
- **Plano por faixa:** arquivo "M-1 Plano de Vendas" do mês (aba Acompanhamento Categorias). Os IDs aceitos ficam em `SHEET_PLANOS` e no mapa `PLANO` de `public/index.html` — acrescente o de cada mês novo nos dois.

## Publicar na Vercel

1. Importe este repositório num projeto da Vercel (framework: **Other**, sem build command; a pasta `public` é servida como estática).
2. Em **Settings → Environment Variables**, cadastre as variáveis de `.env.example`. Nunca faça commit dos valores.
3. Configure o login (abaixo). Sem as variáveis de login o dash fica fechado.
4. Rede: o Redshift costuma aceitar só IPs liberados. As funções da Vercel saem por IPs variáveis; se a conexão der timeout, peça ao time de dados para liberar o acesso ou use o Secure Compute da Vercel (IP fixo).

### Login

Só entra quem fizer login com uma conta Google Workspace dos domínios liberados (padrão: `vissimo.com.br`, `evino.com.br` e `grandcru.com.br`; troque em `AUTH_ALLOWED_DOMAINS`). Contas pessoais do Google criadas com esses e-mails não entram. Quem controla o acesso é o `middleware.js`, que roda antes de qualquer página ou `/api`, e a `api/data.js` confere a sessão de novo. A sessão dura 7 dias, e o botão **Sair** fica no topo do dash.

1. No Google Cloud (o mesmo projeto da conta de serviço serve), abra **APIs e serviços → Tela de consentimento OAuth** e escolha o tipo **Externo**, já que as empresas podem ser organizações diferentes no Google. Use só os escopos `openid`, `email` e `profile` e clique em **Publicar app**: em modo de teste só entram os usuários de teste.
2. Em **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**, cadastre o URI de redirecionamento `https://<domínio do dash>` (sem barra no final), um para cada domínio que for usar.
3. Na Vercel, cadastre `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` e `AUTH_SECRET` (texto aleatório de 32+ caracteres) e faça um redeploy.

### Credenciais recomendadas

- **Redshift:** um usuário de serviço só leitura, com acesso às cinco tabelas acima.
- **Google Sheets:** uma conta de serviço do Google Cloud; cole o JSON inteiro em `GOOGLE_SERVICE_ACCOUNT_JSON` e compartilhe as planilhas com o `client_email` dela como leitor.
- **Meta Ads:** token de usuário de sistema do Business Manager com permissão `ads_read` na conta 775254035944122.

## Rodar localmente

```
npm install
npx vercel dev
```

com um arquivo `.env` (fora do git) preenchido a partir de `.env.example`.
