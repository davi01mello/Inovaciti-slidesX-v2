# CITi Slides

Ferramenta interna do CITi (empresa júnior de tecnologia e IA do CIn UFPE) pra criar
apresentações institucionais com IA: você descreve a ideia, o sistema monta o storyboard,
você revisa e edita, e cada slide é composto ao vivo sobre os templates oficiais da
identidade CITi (dark premium, verde, escultura 3D, tipografia bold).

## Como funciona

1. **Briefing**: um wizard de 5 passos coleta ideia, direção (objetivo, público, voz e
   **cor**), extensão (quantos slides, com o sistema recomendando o número lido do
   próprio briefing) e anexos, e fecha numa revisão. Nenhuma página rola até o botão.
   A ideia também pode chegar por **ditado por voz** (transcrição via Whisper) ou
   **importada direto de uma página do Notion** — os dois opcionais, sem a chave
   correspondente o botão simplesmente não aparece.
2. **Storyboard em duas etapas**: primeiro um Agente Estrategista (Gemini) recebe o
   briefing completo e produz um plano interno (arco narrativo, papel, mensagem e
   **formato** de cada slide) que nunca aparece pro usuário; depois a IA geradora
   escreve o conteúdo seguindo o plano. Cada slide de conteúdo é um **formato de um
   catálogo** (afirmação, apoio, citação, tópicos, cards, split, número, indicadores,
   comparação, jornada) escolhido pelo que o slide apresenta — proposta tem slide de
   investimento, relatório abre com o resultado — com variedade obrigatória (vizinhos
   nunca repetem formato) e densidade garantida pelo servidor: nenhum bloco passa de
   25 palavras, nenhum slide sai oco (`api/src/normalize.ts`). O timeout de cada
   chamada escala com a quantidade de slides pedida — um deck de 50 não usa o mesmo
   teto que um de 8 (`api/src/routes/generate.ts`). Posição, cor e tipografia são
   código determinístico, nunca decisão da IA. Todos os prompts vivem em
   `api/src/intelligence/`.
3. **Revisão**: workspace WYSIWYG — o palco é o próprio template, clicou no texto, edita
   no lugar. A barra de cor no palco repinta o deck inteiro em tempo real. Blocos de
   lista (tópicos, etapas, cards, métricas, comparação) crescem e encolhem: adiciona
   item pelo botão, remove pelo "×" que aparece em cada um. Dá pra soltar logos da
   marca ou de empresas parceiras (`app/src/assets/company-logos/`) e gerar imagem
   nova com IA (OpenAI Images) direto no editor.
4. **Composição: meça a arte, não a anote.** Cada slide é montado sobre uma arte real da
   marca (`app/src/assets/templates/`, geradas de `brand/templates-src/`). Na build, um
   script MEDE cada arte e guarda uma grade de ocupação 16×9; em runtime, cada arquétipo
   propõe vários arranjos e o motor pontua cada um contra a grade daquela arte, e escolhe
   o mais vazio (`app/src/services/artZones.ts`). O texto nunca cai sobre a escultura, e
   um véu proporcional garante contraste quando nenhum arranjo fica limpo. O diretor de
   arte (`deckArt.ts`) monta o deck inteiro de uma vez: artes variadas, todas na mesma
   faixa do **eixo de cor** (`tone.ts`, interpolado em OKLab). Quatro famílias visuais
   hoje — Capas, Canvas, Espiral, Diva — cada uma com seu papel no deck (herói, miolo,
   virada). Fundos com movimento (WebP animado) existem ao lado dos estáticos. Arte
   nova entra sozinha: joga o PNG (ou MP4, pra fundo animado) em `brand/templates-src/`
   e roda `python3 brand/tools/build_templates.py`. Ver o mapa completo em
   `brand/README.md`.
5. **Importar de fora**: um `.pptx` externo também pode virar um rascunho no CITi
   Slides — cada lâmina do arquivo original entra como imagem de fundo (fiel ao
   desenho original) com o texto extraído virando caixas soltas editáveis por cima
   (`app/src/lib/pptxImport.ts`). Não recompõe no sistema de arquétipos da casa; é o
   caminho rápido pra trazer algo pronto e continuar editando aqui.
6. **Apresentar e exportar**: modo apresentação (setas, F pra tela cheia) e exportação
   PPTX real no navegador — a arte (inclusive fundos e elementos com movimento) é
   rasterizada localmente e os textos entram como caixas de texto REAIS, editáveis no
   PowerPoint. Um botão à parte ("Abrir no Canva") sobe o `.pptx` montado pra uma conta
   Canva da própria CITi via integração OAuth server-side — ver `api/README.md`.

## Estrutura

```
api/     Express + TypeScript: Gemini (storyboard/chat), Canva, Notion, imagem e voz
app/     React 19 + Vite + Tailwind 4: home, wizard, workspace, composição, apresentação
brand/   O sistema visual: artes mestras, o pipeline de medição e o MAPA (brand/README.md)
docs/    Decisões de escopo adiadas conscientemente (docs/POSTPONED.md)
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
`/api`). Sem a chave a UI funciona, mas as ações de IA respondem com erro claro. Só
`GEMINI_API_KEY` é indispensável pra geração funcionar — Canva, Notion, OpenAI e login
compartilhado são opcionais em dev (ver `api/.env.example` pra cada uma).

## Produção / deploy

**Deploy alvo: Railway, um serviço só.** Em produção a própria API serve o front
buildado (`app/dist`) no mesmo domínio — sem CORS, sem reverse proxy externo, sem
segundo serviço. `api/src/index.ts` checa se `app/dist` existe: se existir, todo GET
que não seja `/api/*` cai no `index.html` (SPA), e os arquivos de `app/dist/assets/`
são servidos como estáticos. Em dev isso é um no-op (o Vite continua servindo o front
na 5173) — só passa a valer quando os dois `dist/` já foram buildados.

`railway.json` na raiz já configura o build (builda `api/` e `app/` em sequência) e o
start (`node api/dist/index.js`) e o healthcheck (`/api/health`). Passo a passo:

1. No Railway, **New Project → Deploy from GitHub repo**, aponte pra este repositório.
   Ele detecta o `railway.json` sozinho — não precisa mexer em Root Directory nem
   builder.
2. **Antes** de depender de um boot bem-sucedido, gere o domínio público em
   **Settings → Networking → Generate Domain** — isso cria a URL
   (`algumacoisa.up.railway.app`) na hora, independente do app estar rodando.
3. Em **Variables**, preencha as 4 obrigatórias de uma vez: `GEMINI_API_KEY`,
   `SITE_USERNAME`, `SITE_PASSWORD` e `ALLOWED_ORIGINS` (com a URL do passo 2, ex:
   `https://algumacoisa.up.railway.app`). O boot da API **aborta o processo**
   (`process.exit(1)`) se qualquer uma das 4 estiver ausente com
   `NODE_ENV=production` — não é aviso, é bloqueante — por isso a ordem importa:
   sem o domínio gerado antes, é preenche-deploy-crasha-preenche de novo.
   `NODE_ENV=production` o Railway já seta sozinho.
4. `TRUST_PROXY=1` — não é obrigatória (o boot não trava sem ela), mas sem ela o
   rate limit por IP enxerga o IP do proxy do Railway em vez do IP real do usuário.
5. Canva, Notion, OpenAI (geração de imagem) e transcrição de voz continuam
   opcionais — sem a chave de cada uma, o recurso correspondente some ou devolve erro
   claro na UI, o resto do app funciona normal.

Todas as variáveis (obrigatórias e opcionais) estão documentadas em
`api/.env.example`.

Coisas que continuam valendo depois do deploy, porque são decisão de produto, não
de infraestrutura:

- **Sem persistência no servidor.** Toda apresentação vive no `localStorage` do
  navegador de quem criou — não tem banco, não sincroniza entre dispositivos, e limpar
  os dados do navegador apaga o trabalho (ver `docs/POSTPONED.md`). Se o time for
  depender disso de verdade pro dia a dia, backend de persistência é o próximo passo
  real, não deploy.
- **Rate limit é por instância.** O contador vive em memória do processo Node — se um
  dia isso escalar pra mais de uma instância no Railway, cada uma tem seu próprio teto
  (ver `docs/POSTPONED.md`; Redis resolveria, mas só faz sentido com escala horizontal
  de verdade — um serviço só no Railway não precisa disso).
- **Os fundos animados pesam.** O bundle de assets (`app/dist/assets/`) passa de 90MB
  no total, com alguns WebP animados individuais entre 3–8MB — cada um só é baixado
  quando o slide que o usa é realmente exibido (import estático vira URL, não é
  inlinado no JS), então isso não vira 90MB de download por visita. Vale de olho se a
  banda do plano Railway começar a apertar.

## Segurança e escala (resumo do que a API garante)

- CORS restrito por env, helmet, cookie de sessão httpOnly (`secure` automático em
  produção).
- Login compartilhado (usuário/senha únicos pro time) protegendo toda rota que não seja
  `/api/health` ou o próprio login.
- Rate limit por IP e por sessão em toda rota de IA (tetos independentes por rota —
  geração, chat, melhoria, imagem, Notion, transcrição — ver `api/.env.example`).
- Validação Zod com limite de tamanho em todo campo de entrada.
- Timeout escalado por tamanho do pedido, retry com backoff e jitter, e circuit breaker
  por serviço (abre depois de 5 falhas seguidas, fecha sozinho depois de 30s) em toda
  chamada de IA.
- Logs estruturados (pino) sem conteúdo de usuário em nível info.
- Graceful shutdown esperando as requisições em andamento (teto de 30s).

## Manutenção

- `node scripts/check-contract.mjs` roda sozinho no predev/prebuild dos dois pacotes.
- Decisões de escopo adiadas conscientemente: `docs/POSTPONED.md`.
- Sistema visual (artes, cor, zonas, prompts, logos): `brand/README.md`.
- Integrações (Canva, Notion, OpenAI) e todos os endpoints: `api/README.md`.
