# Smoke test end to end (branch fable)

> **Nota (07/2026):** o pipeline de geração de imagem final (render-all/render-image,
> SSE, fila, cache, OpenAI) foi substituído pela composição de templates no front
> (`app/src/components/present/SlideComposition.tsx`). Os itens 1, 9, 11-14, 16
> (drenagem de fila), 18, 19 e as linhas de "Pendente de chave" que falam de geração
> de imagem descrevem um fluxo que não existe mais — mantidos aqui só como registro
> histórico da execução.

Executado em 05/07/2026, máquina de dev (macOS, Node 24), sem chaves de API no `.env`.
Tudo que não depende de chamada real a Gemini/OpenAI foi exercitado e passou.
O que depende de chave está marcado como "pendente de chave" e descrito em docs/QUESTIONS.md.

## Backend

| # | Teste | Resultado |
| --- | --- | --- |
| 1 | Boot com preload das 4 refs em memória | OK ("referências visuais carregadas em memória") |
| 2 | `GET /api/health` | OK, indica geminiConfigured/openaiConfigured |
| 3 | Boot em produção sem chaves | OK, aborta com exit 1 e mensagem clara em stderr |
| 4 | Zod: idea com menos de 100 chars | OK, 400 "Campo inválido: idea (a ideia precisa ter pelo menos 100 caracteres)." |
| 5 | Zod: message com 5000 chars | OK, 400 apontando o campo e o limite |
| 6 | CORS com Origin desconhecida | OK, 403 |
| 7 | Path traversal em presentationId (`../../etc`) | OK, 400 bloqueado pelo regex (mais defesa em profundidade no resolve) |
| 8 | JSON malformado | OK, 400 JSON limpo com request_id, sem stack |
| 9 | Rate limit de imagem (30/h por IP) | OK, 429 na 31ª request com Retry-After |
| 10 | Rate limit de geração (10/h por IP) | OK, 429 na 11ª |
| 11 | `POST render-all` | OK, 202 com jobId imediato |
| 12 | SSE: started, slide_failed com mensagem clara, all_done | OK |
| 13 | SSE: replay pra cliente que conecta depois do fim do job | OK, recebe o histórico completo |
| 14 | Isolamento multi tenant: stream de job com presentationId de outra apresentação | OK, 404 |
| 15 | Erro de IA vira categoria (`unavailable` sem chave) | OK, front recebe `{ error, category }` |
| 16 | Graceful shutdown em SIGTERM | OK, drena a fila, fecha o HTTP e sai limpo |
| 17 | Headers: helmet CSP, nosniff, X-Request-Id, cookie httpOnly sameSite strict | OK |
| 18 | Overlay do logo via sharp (posicionado proporcionalmente na imagem 2048x1152, 16:9 exato, sem corte) | OK, logo "citi" limpo no canto superior esquerdo |
| 19 | `npm run cleanup` | OK (mensagem correta com generated/ vazio) |
| 20 | `npm run typecheck` e `npm run build` | OK |

## Front

| # | Teste | Resultado |
| --- | --- | --- |
| 21 | `npm run dev` sobe com check:contract ok antes | OK |
| 22 | `npm run build` (contrato + tsc + vite) | OK |
| 23 | oxlint com ban de any explícito | OK, zero erros |
| 24 | `check:contract` compara as 12 declarações do contrato | OK |

## Pendente de chave (rodar com api/.env preenchido)

| Teste | Como rodar |
| --- | --- |
| Fluxo completo pela UI (wizard, storyboard, edição, chat, melhorar slide) | docs/QUESTIONS.md item 1 |
| Geração final com SSE atualizando a UI em tempo real | idem |
| Comparação visual dos PNGs com as refs Sympla (critério número um) | idem, máximo 3 iterações de refino do master prompt |
| Cache: gerar a mesma coisa duas vezes, segunda instantânea | gerar, apagar imageUrl no front (regerar), conferir resposta imediata e ausência de nova chamada no log |
| Timeout 504 amigável | derrubar a rede no meio de uma geração ou reduzir LLM_TIMEOUT_MS |
| Dedupe de request em voo | dois cliques rápidos em gerar, conferir no log um job só |

## Observações

- A cascata de bolhas do chat não reinicia ao sair e voltar da tela: os setTimeout rodam
  uma vez por geração e o guard de existência da apresentação segura o resto (conferido no código,
  `runGeneration` em presentationsStore.ts).
- O bundle único de ~730kb do front gera aviso no build do Vite; registrado em POSTPONED.md.
