# CITi Slides — API

Backend do CITi Slides: agente conversacional (Gemini) que gera e edita o storyboard,
mais um punhado de integrações opcionais (Canva, Notion, geração de imagem OpenAI,
transcrição de voz). A composição visual dos slides acontece no front, sobre os
templates oficiais da identidade CITi — não existe pipeline de geração de imagem de
fundo por IA.

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

Autenticação (login compartilhado — ver seção abaixo):
- `GET /api/auth/status` — se a sessão atual está autenticada
- `POST /api/auth/login` — `{ username, password }` → seta o cookie de sessão
- `POST /api/auth/logout`

Todo o resto exige a sessão autenticada (middleware `requireAuth`), exceto
`/api/health` e o handshake OAuth da Canva:

- `POST /api/presentations/generate` — `{ idea, slideCount, goal, audience, style, assets }`
  → `{ slides, chat }`. Timeout por tentativa escala com `slideCount`.
- `POST /api/chat` — `{ idea, size, style, slides, history, message }` → `{ reply }`
- `POST /api/slides/improve` — `{ idea, size, style, slide, otherSlides }` → `{ blocks }`
- `GET /api/health` — `geminiConfigured` indica se a key está presente (não exige sessão)
- `POST /api/presentations/{id}/export-canva?title=...` — corpo é o `.pptx` binário
  montado pelo front (Content-Type do pptx) →
  `200 { status: 'success', editUrl }` ou `202 { status: 'in_progress', jobId }`
- `GET /api/presentations/{id}/export-canva/{jobId}/status` — consulta o job acima
- `POST /api/images/generate` — gera imagem sob demanda com IA (OpenAI Images,
  `gpt-image-1`) pro editor. Sem `OPENAI_API_KEY`, devolve erro claro; a ação mais
  cara do app, rate limit dedicado e apertado de propósito.
- `GET /api/notion/pages` — lista as páginas que a integração Notion enxerga
- `GET /api/notion/pages/{id}/content` — conteúdo de uma página, pro wizard importar
  como briefing. Sem `NOTION_API_KEY`, o botão de importar nem aparece no front.
- `POST /api/transcribe` — áudio gravado no navegador → texto (Whisper), pro ditado
  por voz no wizard e no chat.

Handshake OAuth da integração Canva (aberto manualmente no navegador, não é chamado
pelo front do CITi Slides — ver seção "Integração Canva" abaixo):
- `GET /api/canva/oauth/start`
- `GET /api/canva/oauth/callback`

Rotas de IA (generate, chat, improve, images, notion, transcribe) têm rate limit por
IP e por cookie de sessão, cada uma com teto próprio (ver `.env.example`). Erros
voltam como `{ error, category }`: o front trata cada categoria de um jeito.

## Login compartilhado

Usuário e senha únicos pra toda a equipe (`SITE_USERNAME`/`SITE_PASSWORD` no `.env`,
obrigatórios em produção). Não é conta por pessoa — é um gate simples pra manter a
ferramenta fora do alcance de quem não é do time. `POST /api/auth/login` seta um
cookie de sessão httpOnly (`secure` automático em produção); toda rota exceto
`/api/health`, o próprio login/status/logout e o handshake OAuth da Canva passa por
esse gate (`requireAuth`).

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
