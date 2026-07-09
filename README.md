<div align="center">

</div>

# NutriCompare v2

Compare tabelas nutricionais com IA e motor de pontuação determinístico.

## Como rodar localmente

**Pré-requisitos:** Node.js 18+

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure a chave da API do Gemini.
   Copie o arquivo de exemplo e preencha com sua chave:
   ```bash
   cp .env.example .env
   # edite .env e defina GEMINI_API_KEY=sua_chave_aqui
   ```
   A chave é usada apenas no lado do servidor (`api/extract.ts`) e nunca é
   exposta ao navegador.

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   O vite serve o frontend e também responde a `/api/extract` via middleware,
   sem precisar do `vercel dev`.

## Executar os testes

```bash
npm test
```

O comando roda a suíte completa do Vitest (engine de pontuação + normalização).
Todos os 50 testes devem passar.

## Variáveis de ambiente

| Variável | Onde definir | Descrição |
|---|---|---|
| `GEMINI_API_KEY` | `.env` (dev) / Vercel dashboard (prod) | Chave da API Gemini 2.5 Flash |

## Deploy (Vercel)

1. Importe o repositório no dashboard do Vercel.
2. Defina `GEMINI_API_KEY` nas variáveis de ambiente do projeto.
3. O build é `vite build`; nenhuma configuração extra é necessária.

## Segurança e proteção de cota

### Teto de cota no Google AI Studio (recomendado)

O endpoint `/api/extract` possui um rate limiter em memória (10 req/60 s por IP,
por instância serverless) como primeira linha de defesa. Entretanto, **o backstop
definitivo contra abuso financeiro é definir um teto de cota ou orçamento diretamente
no Google AI Studio** (ou na Google Cloud Console):

- Acesse **Google AI Studio → Get API Key → Manage quotas** (ou Cloud Console →
  APIs & Services → Gemini API → Quotas & System limits).
- Defina um limite diário de tokens ou de requisições compatível com o tráfego
  esperado da sua aplicação.
- Configure alertas de faturamento para ser notificado antes de atingir o teto.

Isso garante que, mesmo que o rate limiter in-memory seja contornado (ex.: múltiplas
instâncias serverless em paralelo), o custo total permaneça controlado.

### Upgrade do rate limiter para produção (Vercel KV)

O limitador atual é **best-effort**: cada instância serverless mantém sua própria
memória e não sincroniza com as demais. Para um rate limit rigoroso multi-instância,
faça o upgrade para [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (Redis
gerenciado): troque o `Map` in-memory por operações atômicas `ZADD` / `ZCOUNT` /
`ZREMRANGEBYSCORE` na chave `ratelimit:<ip>` com TTL de 60 s. Isso garante contagem
consistente independentemente de quantas instâncias estejam ativas.
