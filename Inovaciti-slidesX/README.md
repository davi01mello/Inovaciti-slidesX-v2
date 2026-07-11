# CITi Slides

Ferramenta interna do CITi (empresa júnior de tecnologia e IA do CIn UFPE) pra criar
apresentações institucionais com IA: você descreve a ideia, o sistema monta o storyboard,
você revisa e edita, e cada slide é composto ao vivo sobre os templates oficiais da
identidade CITi (dark premium, verde, escultura 3D, tipografia bold).

## Como funciona

1. **Briefing**: um wizard de 5 passos coleta ideia, tamanho e estilo.
2. **Storyboard**: o Gemini gera só o conteúdo textual estruturado (títulos, bullets,
   destaques). Posição, cor e tipografia são código determinístico, nunca decisão da IA.
3. **Revisão**: workspace com edição direta nos blocos, chat com contexto do storyboard
   e botão de reescrever slide.
4. **Composição no template**: cada slide é montado sobre a arte real do template
   (fundos limpos em `app/src/assets/templates/`, derivados das páginas do deck em
   `api/assets/references/`). O motor detecta o arquétipo do conteúdo (capa,
   afirmação, cards, linhas, número gigante) e posiciona os textos nas zonas que o
   design reservou, com tipografia adaptativa. Nada de geração de imagem por IA.
5. **Apresentar e exportar**: modo apresentação (setas, F pra tela cheia) e exportação
   PPTX real no navegador (os slides compostos são rasterizados localmente).

## Estrutura

```
api/   Express + TypeScript: Gemini (storyboard/chat) e integração Canva
app/   React 19 + Vite + Tailwind 4: home, wizard, workspace, composição, apresentação
docs/  AUDIT.md (mapa técnico), SMOKE_TEST.md, POSTPONED.md, QUESTIONS.md
scripts/check-contract.mjs  Falha o build se os tipos espelhados api/app divergirem
```

## Rodando localmente

```bash
# terminal 1
cd api && npm install && cp .env.example .env   # preencha as chaves no .env
npm run dev

# terminal 2
cd app && npm install
npm run dev
```

Front em `http://localhost:5173`, API em `http://localhost:8787` (o Vite já proxia
`/api`). Sem a chave a UI funciona, mas as ações de IA respondem com erro claro.

## Produção

O boot da API aborta se `GEMINI_API_KEY` ou `ALLOWED_ORIGINS` estiverem ausentes
com `NODE_ENV=production`. Atrás de reverse proxy, defina `TRUST_PROXY=1` pro rate
limit enxergar o IP real. Todas as variáveis estão documentadas em `api/.env.example`.

## Segurança e escala (resumo do que a API garante)

- CORS restrito por env, helmet, cookie de sessão httpOnly.
- Rate limit por IP e por sessão em toda rota de IA.
- Validação Zod com limite de tamanho em todo campo de entrada.
- Timeout, retry com backoff e circuit breaker em toda chamada de IA.
- Logs estruturados (pino) sem conteúdo de usuário em nível info.
- Graceful shutdown esperando as requisições em andamento.

## Manutenção

- `node scripts/check-contract.mjs` roda sozinho no predev/prebuild dos dois pacotes.
- Decisões de escopo adiadas: `docs/POSTPONED.md`. Pendências humanas: `docs/QUESTIONS.md`.
