<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
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
