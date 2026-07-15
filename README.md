# CITi Slides

Ferramenta interna do CITi (empresa júnior de tecnologia e IA do CIn UFPE) pra criar
apresentações institucionais com IA: você descreve a ideia, o sistema monta o storyboard,
você revisa e edita, e cada slide é composto ao vivo sobre os templates oficiais da
identidade CITi (dark premium, verde, escultura 3D, tipografia bold).

## Como funciona

1. **Briefing**: um wizard de 5 passos coleta ideia, direção (objetivo, público, voz e
   **cor**), extensão (quantos slides, com o sistema recomendando o número lido do
   próprio briefing) e anexos, e fecha numa revisão. Nenhuma página rola até o botão.
2. **Storyboard em duas etapas**: primeiro um Agente Estrategista (Gemini) recebe o
   briefing completo e produz um plano interno (arco narrativo, papel e mensagem de
   cada slide) que nunca aparece pro usuário; depois a IA geradora escreve o conteúdo
   textual estruturado seguindo o plano. O texto é **pontos-chave escaneáveis** (cards
   e tópicos), nunca parede de texto nem cartaz vazio. Posição, cor e tipografia são
   código determinístico, nunca decisão da IA. Todos os prompts vivem em
   `api/src/intelligence/`.
3. **Revisão**: workspace WYSIWYG — o palco é o próprio template, clicou no texto, edita
   no lugar. A barra de cor no palco repinta o deck inteiro em tempo real.
4. **Composição: meça a arte, não a anote.** Cada slide é montado sobre uma arte real da
   marca (`app/src/assets/templates/`, geradas de `brand/templates-src/`). Na build, um
   script MEDE cada arte e guarda uma grade de ocupação 16×9; em runtime, cada arquétipo
   propõe vários arranjos e o motor pontua cada um contra a grade daquela arte, e escolhe
   o mais vazio (`app/src/services/artZones.ts`). O texto nunca cai sobre a escultura, e
   um véu proporcional garante contraste quando nenhum arranjo fica limpo. O diretor de
   arte (`deckArt.ts`) monta o deck inteiro de uma vez: artes variadas, todas na mesma
   faixa do **eixo de cor** (`tone.ts`, interpolado em OKLab). Arte nova entra sozinha:
   joga o PNG em `brand/templates-src/` e roda `python3 brand/tools/build_templates.py`.
   Ver o mapa completo em `brand/README.md`.
5. **Apresentar e exportar**: modo apresentação (setas, F pra tela cheia) e exportação
   PPTX real no navegador — a arte é rasterizada localmente e os textos entram como
   caixas de texto REAIS, editáveis no PowerPoint e na Canva.

## Estrutura

```
api/     Express + TypeScript: Gemini (storyboard/chat) e integração Canva
app/     React 19 + Vite + Tailwind 4: home, wizard, workspace, composição, apresentação
brand/   O sistema visual: artes mestras, o pipeline de medição e o MAPA (brand/README.md)
scripts/check-contract.mjs  Falha o build se os tipos espelhados api/app divergirem
```

**Comece por `brand/README.md`**: é o mapa de onde vive cada peça do sistema visual
(artes, eixo de cor, motor de zonas, prompts, logos).

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
- Decisões de escopo adiadas conscientemente: `docs/POSTPONED.md`.
- Sistema visual (artes, cor, zonas, prompts, logos): `brand/README.md`.
