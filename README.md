# War Room · Evino e-commerce

Dash de acompanhamento comercial, growth e CRM do e-commerce Evino, com abas **Hoje**, **Ontem** e **Mês até ontem**. É a versão para a Vercel do dash que nasceu no Claude: mesmo layout e mesmos cálculos, mas os dados vêm direto das fontes, sem passar pelos conectores do Claude.

## Como funciona

```
public/        página estática (index.html, data.js, fonts.css, runtime.js)
api/data.js    função serverless: GET /api/data?id=<fonte>&<parâmetros>
lib/           acesso às fontes (Redshift, Google Sheets, Meta Ads)
```

- `public/runtime.js` faz o papel do runtime de dashboards do Claude: busca cada fonte em `/api/data`, roda os cálculos de `data.js` e redesenha os blocos. Atualiza sozinho a cada 5 minutos com a aba aberta.
- `api/data.js` valida os parâmetros, consulta a fonte e guarda o resultado em memória por 3 minutos (Hoje) ou 30 minutos (dias fechados).

| Fonte | O que alimenta | Onde está |
|---|---|---|
| Redshift | vendas, pedidos, kits, hora a hora, faixas, canal × SKU, último clique | `lib/redshift-sources.js` |
| Google Sheets | Monitoramento de Canais (receita LC, metas, investimento) e Plano de Vendas do mês | `lib/sheets-sources.js` |
| Meta Ads (Marketing API) | gasto, impressões, cliques e compras por anúncio; série diária | `lib/meta-sources.js` |
| Insider One | email e WhatsApp | **ainda não conectado**: o bloco de CRM mostra "—" |

### Tabelas do Redshift

| Uso | Tabela padrão | Variável para trocar |
|---|---|---|
| Pedidos × item | `dora_red_aggregations.ev_fact_order_item` | `T_FACT_ORDER_ITEM` |
| Último clique | `vissimo_bi.vw_ev_last_click_pedido` | `T_LAST_CLICK` |
| Kits | `dora_red_aggregations.vw_ev_dim_product_bundle` | `T_DIM_BUNDLE` |
| Grupo de produto (faixas) | `dora_red_aggregations.vw_carga_ev_grupo_de_produto` | `T_GRUPO_PRODUTO` |
| Produto | `dora_red_aggregations.ev_dim_product` | `T_DIM_PRODUCT` |

São as tabelas de origem das views do Dados Víssimo (registro do ETL). As colunas usadas são as mesmas das views; se alguma tiver outro nome no Redshift, o erro aparece na própria tela e nos logs da função.

## Conceitos de receita

- **Ontem e Mês até ontem:** pedidos pagos (`is_paid = 1`), receita = `price_to_pay + item_shipping_amount`.
- **Hoje:** boleto condition — pedidos solid (`is_solid = 1`, pagos ou não), sem SAC, televendas (cupom `TV*`), ItaúShop (pedido `BRI*`) e Vivino; receita, frete e CM2 de boleto a 65% e PIX a 75%. PMV sem o fator.
- **Receita last click por canal, metas e investimento:** planilha Monitoramento de Canais.
- **Plano por faixa:** arquivo "M-1 Plano de Vendas" do mês (aba Acompanhamento Categorias). Os IDs aceitos ficam em `SHEET_PLANOS` e no mapa `PLANO` de `public/index.html` — acrescente o de cada mês novo nos dois.

## Publicar na Vercel

1. Importe este repositório num projeto da Vercel (framework: **Other**, sem build command; a pasta `public` é servida como estática).
2. Em **Settings → Environment Variables**, cadastre as variáveis de `.env.example`. Nunca faça commit dos valores.
3. Em **Settings → Deployment Protection**, ligue a proteção (Vercel Authentication ou senha): o dash mostra receita e margem.
4. Rede: o Redshift costuma aceitar só IPs liberados. As funções da Vercel saem por IPs variáveis; se a conexão der timeout, peça ao time de dados para liberar o acesso ou use o Secure Compute da Vercel (IP fixo).

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
