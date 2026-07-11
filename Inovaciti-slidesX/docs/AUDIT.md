# Auditoria técnica do CITi Slides (branch fable)

Data: 05/07/2026. Base auditada: commit 8b87b1e (main com exportação PPTX real já mesclada).

Este documento mapeia tudo que impede o sistema de ir pra produção, com localização exata.
Cada item recebe a fase do plano em que será resolvido.

## 1. Qualidade visual da imagem gerada (Fase 3, a mais importante)

| Problema | Onde | Detalhe |
| --- | --- | --- |
| Geração de imagem sem grounding visual | `api/src/images/openaiImage.ts:33` | Usa `images.generate` só com prompt textual. O modelo nunca vê as referências Sympla, então erra escultura, tipografia e distribuição de cor. Solução: `images.edit` com as 4 refs como input. |
| Refs Sympla não estavam no repositório | `api/assets/references/` | Corrigido nesta fase: as 4 imagens foram convertidas pra PNG (1536x864) e commitadas como fonte de verdade visual. |
| Logo prometido mas nunca inserido | `api/src/images/imagePrompt.ts:40` | O prompt reserva 18% do canto superior esquerdo ("logo will be inserted later") mas nenhum código insere logo. Solução: compositar com sharp após a geração. |
| Sem cache de imagem | `api/src/routes/renderImage.ts:44` | Regenerar o mesmo slide gasta outra chamada OpenAI. Solução: hash SHA-256 do input (prompt + refs + estilo) como chave de cache em disco. |
| Nome de arquivo fixo por slide | `api/src/routes/renderImage.ts:48` | `{slideId}.png` impede múltiplas versões do mesmo slide. Solução: `{slideId}-{sha8}.png`. |

## 2. Segurança (Fase 1)

| Problema | Onde | Detalhe |
| --- | --- | --- |
| CORS aberto pra qualquer origem | `api/src/index.ts:15` | `app.use(cors())` sem configuração. Solução: lista de origens via env `ALLOWED_ORIGINS`. |
| Zero rate limiting | todas as rotas | Qualquer IP pode disparar gerações ilimitadas e queimar a cota da OpenAI. Solução: `express-rate-limit` por IP e por cookie de sessão, tetos por rota. |
| Zero headers de segurança | `api/src/index.ts` | Sem helmet, sem CSP, sem nosniff. |
| Validação de entrada superficial | `api/src/routes/generate.ts:16`, `chat.ts:15`, `improve.ts:21`, `renderImage.ts:33` | Só verifica presença e tipo do campo principal. Nenhum cap de tamanho por campo (uma `idea` de 900kb passa). Solução: schemas Zod com limites por campo. |
| Path traversal: defesa única | `api/src/routes/renderImage.ts:17` | O regex `SAFE_ID` é bom, mas é a única camada. Solução: validar também que o caminho resolvido continua dentro de `generated/`. |
| Logs vazam conteúdo e stack | `generate.ts:38`, `chat.ts:37`, `improve.ts:51`, `renderImage.ts:53` | `console.error` com o erro cru. Solução: pino com serialização controlada, conteúdo de usuário só em nível debug. |
| Sem fail fast em produção | `api/src/index.ts:36` | Servidor sobe sem chaves e só avisa em warning. Em produção isso vira erro silencioso por request. Solução: abortar o boot se `NODE_ENV=production` e faltar chave. |
| Control chars não sanitizados | `api/src/normalize.ts:27` | Texto vindo do modelo pode conter `\x00` a `\x1F`. Solução: filtrar (preservando `\n` e `\t`) e fazer trim. |
| Sem error handler global | `api/src/index.ts` | Exceção não capturada vira a página de erro padrão do Express (stack em HTML). Solução: middleware final com JSON limpo e `request_id`. |
| Sem detecção de prompt injection | `generate.ts`, `chat.ts` | Solução: heurística leve que loga tentativas óbvias em warning, sem bloquear. |

## 3. Escalabilidade e multi tenant (Fases 2 e 3)

| Problema | Onde | Detalhe |
| --- | --- | --- |
| Chamadas OpenAI sem fila | `api/src/images/openaiImage.ts:33` | N usuários geram N chamadas paralelas: saturação de cota e 429 em cascata. Solução: p-queue com concurrency 3 e backpressure (503 acima de 20 pendentes). |
| Sem dedupe de request em voo | `api/src/routes/renderImage.ts` | Duplo clique ou retry impaciente dispara duas gerações idênticas. Solução: mapa de promises em voo por chave de conteúdo. |
| Geração sequencial no front | `app/src/pages/GenerationPage.tsx:22` | Loop `for` slide a slide: 10 slides em série. Solução: orquestração no backend com endpoint `render-all` e progresso via SSE. |
| Sem compressão HTTP | `api/src/index.ts` | Respostas JSON grandes (storyboard) sem gzip. |
| Sem graceful shutdown | `api/src/index.ts:34` | SIGTERM mata jobs no meio. Solução: drenar fila com timeout e fechar o servidor. |
| Refs seriam lidas do disco a cada request | (novo código) | Solução: preload em memória no boot. |
| Sem limpeza de imagens antigas | `api/generated/` | Cresce sem limite. Solução: script manual de cleanup documentado. |

## 4. Robustez de rede (Fase 2)

| Problema | Onde | Detalhe |
| --- | --- | --- |
| Sem timeout nas chamadas de IA | `api/src/gemini.ts:33`, `openaiImage.ts:33` | Uma chamada pendurada segura a request pra sempre. Solução: AbortController com `LLM_TIMEOUT_MS` (default 60s). |
| Sem retry | idem | 429 ou 5xx transitório vira erro pro usuário na primeira ocorrência. Solução: 3 tentativas com backoff exponencial e jitter, nunca em 4xx de request inválida. |
| Sem circuit breaker | idem | OpenAI fora do ar continua queimando tentativas. Solução: pausa de 30s após 5 falhas seguidas em 60s. |
| Erro opaco no cliente | `app/src/services/aiClient.ts:9` | `AiClientError` sem categoria: o front não distingue timeout de rate limit. Solução: campo `category` com tratamento por tipo. |

## 5. Features fantasma e bugs de UX (Fase 5)

| Problema | Onde | Detalhe |
| --- | --- | --- |
| Compartilhar não compartilha | `app/src/pages/WorkspacePage.tsx:180` | Toast "Link copiado" sem copiar nada. Remover o botão (registrado em POSTPONED.md). |
| Anexar no chat não anexa | `app/src/components/workspace/ChatPanel.tsx:194` | Arquivos viram só metadados e a resposta é hardcoded (`ChatPanel.tsx:91`). Remover do chat; StepAssets do wizard permanece. |
| Exportar | `app/src/lib/exportPptx.ts` | Já é real (PPTX via pptxgenjs, mesclado da main). Mantido. |
| Toast sem botão de fechar | `app/src/components/workspace/ToastHost.tsx` | Só some por timer. Adicionar X. |
| AutosaveIndicator órfão | `app/src/components/workspace/AutosaveIndicator.tsx` | Componente existe mas nunca é renderizado. Conectar no header do workspace. |
| Sem fullscreen no modo apresentação | `app/src/pages/PresentPage.tsx` | Adicionar tecla F. |
| 9 rotas stub no sidebar | `app/src/data/stubRoutes.ts` | Todas levam a ComingSoonPage. Reduzir às que fazem sentido no MVP. |
| Fonte Inter via Google Fonts | `app/index.html:16` | Dependência de rede externa em apresentação ao vivo. Solução: `@fontsource-variable/inter` local. |

## 6. Consistência de código (Fase 4)

| Problema | Onde | Detalhe |
| --- | --- | --- |
| Constantes duplicadas 4x | `generate.ts:10`, `chat.ts:9`, `improve.ts:10`, `renderImage.ts:15` | `VALID_SIZES` e `VALID_STYLES` declaradas em cada rota. Solução: ponto único em `api/src/validation.ts`. |
| Tipos espelhados sem verificação | `api/src/types.ts` vs `app/src/types/generated.ts` | Sincronização manual sem check. Solução: comentário `SYNC_WITH` e script `check:contract` que falha o build se o contrato divergir. |
| Bundle único de 729kb | `app/dist` | Aviso do Vite no build. Code splitting fica registrado em POSTPONED.md (não bloqueia esta entrega). |

## 7. O que já está bom (não mexer além do especificado)

- Separação conteúdo/layout: a IA gera só texto, o layout é código determinístico (`app/src/services/slideLayout.ts`).
- `normalize.ts` descarta saída malformada do Gemini em vez de deixar o front quebrar.
- RichText como AST (`app/src/lib/richText.tsx`), sem markdown solto.
- TypeScript estrito nos dois lados, `noUncheckedIndexedAccess` ligado.
- `presentationsStore` com `useSyncExternalStore` e persistência em localStorage.
- Master prompt de identidade visual (`imagePrompt.ts`) é forte como especificação textual: será refinado, não trocado.
- Exportação PPTX real no navegador.

## Registro de iterações de tuning visual (Fase 3)

Preenchido durante a fase 3, máximo de 3 iterações.

- Iteração 0 (estrutural, sem chamada de API): o master prompt ganhou a seção
  `# REFERENCE IMAGES` no topo com três regras que não existiam: (1) as refs são a verdade
  de composição/tipografia/cor/escultura, (2) proibição explícita de copiar qualquer texto,
  número ou logo das refs (elas são de outro deck), (3) números gigantes 01 02 03 em verde
  quando o conteúdo for enumerado, no formato da ref fornecida (cards ou rows).
- Iteração 1 (05/07/2026, com API real e gpt-image-2): capa e encerramento saíram fiéis
  às refs de primeira (esculturas, tipografia, verde, texto pt-BR intacto). O slide de lista
  colidiu o título gerado com o logo compositado no canto superior esquerdo. Correção na
  seção `# BRAND AREA`: a reserva virou um retângulo explícito (20% da largura x 16% da
  altura, só fundo, nada de texto/cards/ícones/escultura) e todo bloco de conteúdo precisa
  começar abaixo ou à direita dele. Regerado o mesmo slide: logo limpo, layout de rows
  numeradas fiel à ref-03. Validação visual concluída com 1 das 3 iterações permitidas.
- Contexto da validação: modelo gpt-image-2 (2048x1152, 16:9 exato, quality high),
  timeout de imagem dedicado de 240s (o teto antigo de 60s abortava toda geração).
- Iteração 2 (05/07/2026, refinamento pra bater com o deck real Sympla): o Bernardo mandou
  o PPTX/PDF real (AP 02 SYMPLA). Trocamos as 4 refs antigas por 7 páginas renderizadas
  do deck real em 2400x1350 (cover, cards, split, statement, process, rows, bignumber) e
  o referenceSelector passou a escolher por contagem de itens. O MASTER_PROMPT foi reescrito
  do zero pra estética contida: tipografia bem menor (tamanhos em % da altura), fonte
  geométrica amigável (TT Commons/Poppins/Product Sans, nunca Helvetica), respiro mínimo de
  30%, regra dura anti sobreposição (escultura nunca cobre conteúdo), marca top-left só 15%
  reservada, e proibição de rodapé/paginação na arte. Logo compositado ficou bem menor
  (~5.5% da largura) com linha verde de assinatura embaixo. Rodapé "CITi Slides" + número
  removido do SlideRender; paginação do modo apresentação virou pontos/barra de progresso.
