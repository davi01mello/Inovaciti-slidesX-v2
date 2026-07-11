# CITi Slides — API

Backend do CITi Slides: agente conversacional (Gemini) que gera e edita o storyboard,
e integração com a Canva. A composição visual dos slides acontece no front, sobre os
templates oficiais da identidade CITi — não existe mais pipeline de geração de imagem.

## Rodando localmente

```bash
cd api
npm install
cp .env.example .env
# edite .env e preencha GEMINI_API_KEY
npm run dev
```

Sobe em `http://localhost:8787` (configurável via `PORT`). O front (`app/`) já proxia
`/api` pra essa porta em dev. Todas as variáveis de ambiente estão documentadas em
`.env.example`. Em produção o boot aborta sem as chaves críticas.

## Endpoints

- `POST /api/presentations/generate` — `{ idea, size, style, assets }` → `{ slides, chat }`
- `POST /api/chat` — `{ idea, size, style, slides, history, message }` → `{ reply }`
- `POST /api/slides/improve` — `{ idea, size, style, slide, otherSlides }` → `{ blocks }`
- `GET /api/health` — `geminiConfigured` indica se a key está presente
- `POST /api/presentations/{id}/export-canva?title=...` — corpo é o `.pptx` binário
  montado pelo front (Content-Type do pptx) →
  `200 { status: 'success', editUrl }` ou `202 { status: 'in_progress', jobId }`
- `GET /api/presentations/{id}/export-canva/{jobId}/status` — consulta o job acima

Rotas de IA têm rate limit por IP e por cookie de sessão (tetos em `.env.example`).
Erros voltam como `{ error, category }`: o front trata cada categoria de um jeito.

## Integração Canva (exportar direto pro Canva)

Conta única (a da CITi), autorizada uma vez -- não é OAuth por usuário final.

1. Ative MFA na conta Canva, crie uma integração em canva.com/developers (tipo **Public**;
   **Private** exige Canva Enterprise). Não precisa submeter pra revisão -- isso só é
   exigido pra disponibilizar a integração pra outros usuários da Canva.
2. Nas configurações da integração: gere o **Client secret**, marque o escopo
   `design:content:write`, e em **Authorized redirects** cadastre
   `http://127.0.0.1:8787/api/canva/oauth/callback` (tem que bater exatamente com
   `CANVA_REDIRECT_URI` do `.env`).
3. Preencha `CANVA_CLIENT_ID` e `CANVA_CLIENT_SECRET` no `.env`.
4. Com a API rodando (`npm run dev`), abra `http://localhost:8787/api/canva/oauth/start`
   no navegador uma única vez e aprove o acesso.

Isso salva o refresh token em `api/.canva-tokens.json` (gitignored). Daí em diante o
botão "Abrir no Canva" no workspace funciona sozinho -- o access token é renovado
automaticamente, nunca pede login de novo (a menos que o acesso seja revogado
manualmente na conta Canva).

## Manutenção

- `npm run typecheck` e `npm run build` (o build roda o check de contrato de tipos antes).

## Nunca commitar

`.env` está no `.gitignore`. As referências visuais em `assets/references/` e o logo
em `assets/` são versionados de propósito: são fonte de verdade do design system (os
fundos de template do front foram derivados delas). `.canva-tokens.json` também é
ignorado -- guarda o refresh token da integração Canva.
