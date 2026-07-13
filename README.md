# CITi Slides

Ferramenta interna do CITi (empresa júnior de tecnologia e IA do CIn UFPE) pra criar
apresentações institucionais com IA: você descreve a ideia, o sistema monta o storyboard,
você revisa e edita, e cada slide é composto ao vivo sobre os templates oficiais da
identidade CITi (dark premium, verde, escultura 3D, tipografia bold).

## Como funciona

1. **Briefing**: um wizard de 5 passos coleta ideia, direção (objetivo, público e voz),
   extensão (quantos slides, com o sistema recomendando o número lido do próprio
   briefing) e anexos, e fecha numa revisão.
2. **Storyboard em duas etapas**: primeiro um Agente Estrategista (Gemini) recebe o
   briefing completo do wizard e produz um plano interno (arco narrativo, papel e
   mensagem de cada slide) que nunca aparece pro usuário; depois a IA geradora escreve
   o conteúdo textual estruturado seguindo o plano. A quantidade de slides vai de 1 a
   50 (exata quando o usuário escolhe, automática na faixa da ocasião quando não).
   Posição, cor e tipografia são código determinístico, nunca decisão da IA. Todos os
   prompts, specs de ocasião/estilo e regras de escrita vivem em `api/src/intelligence/`.
3. **Revisão**: workspace WYSIWYG — o palco é o próprio template, clicou no texto,
   edita no lugar. Chat com contexto do storyboard e botão de reescrever slide.
4. **Composição no template**: cada slide é montado sobre a arte real do template
   (fundos limpos em `app/src/assets/templates/`, derivados das páginas do deck em
   `api/assets/references/`). O motor detecta o arquétipo do conteúdo (capa,
   afirmação, cards, linhas, número gigante) e posiciona os textos nas zonas que o
   MANIFESTO de cada fundo declara (`app/src/services/templateManifest.ts`), com
   tipografia Sora, área protegida da logo e quebras equilibradas (nunca órfãos).
   Nada de geração de imagem por IA. Fundo novo entra pelo fluxo híbrido:
   `api/scripts/proposeZones.ts` propõe as zonas com IA de visão, você ajusta e
   registra no manifesto — o runtime segue 100% determinístico.
5. **Apresentar e exportar**: modo apresentação (setas, F pra tela cheia) e exportação
   PPTX real no navegador — a arte é rasterizada localmente e os textos entram como
   caixas de texto REAIS, editáveis no PowerPoint e na Canva.

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
