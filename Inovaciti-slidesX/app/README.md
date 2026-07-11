# CITi Slides — Front

Interface do CITi Slides: React 19, Vite, Tailwind 4, TypeScript estrito, Motion pra
transições de rota. Sem framework de estado: um store próprio com `useSyncExternalStore`
persiste tudo no `localStorage` do navegador.

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173 (proxia /api e /generated pra api em :8787)
npm run build      # roda o check de contrato de tipos + tsc + vite build
npm run lint       # oxlint (inclui ban de any explícito)
```

## Mapa do código

```
src/pages/         Home, wizard (/nova), workspace, geração (SSE), apresentação
src/components/    layout/ (shell, sidebar, aurora), workspace/ (canvas, chat, toolbar),
                   home/, creation/, present/, ui/ (Button, Icon, Spinner, EmptyState...)
src/stores/        presentationsStore: fonte da verdade das apresentações, persistida
src/services/      aiClient (HTTP tipado com categorias de erro), renderStream (SSE),
                   slideLayout (posicionamento determinístico dos blocos)
src/lib/           richText (AST segura, sem HTML), exportPptx, toast, storage
src/types/         Tipos do domínio. generated.ts espelha api/src/types.ts
                   (verificado por ../scripts/check-contract.mjs no build)
```

## Convenções

- A IA nunca decide layout: conteúdo vem da API como blocos estruturados e o
  posicionamento sai de `services/slideLayout.ts`.
- Texto rico é um array de runs (`lib/richText.tsx`), nunca HTML string.
- Erros de rede viram `AiClientError` com categoria (network, timeout, rate_limit,
  bad_response, server, unavailable) e mensagem pronta em pt-BR.
- Nenhum botão promete o que não entrega: feature que não existe ou fica fora da UI
  ou aparece como "Em construção".
