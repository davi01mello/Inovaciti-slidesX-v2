# Perguntas e pendências que dependem do Bernardo

## 1. Chaves de API pra validação visual (RESOLVIDO em 05/07/2026)

As chaves chegaram, a validação visual rodou com o gpt-image-2 e passou (1 iteração de
refino do MASTER_PROMPT, registrada em docs/AUDIT.md). O roteiro abaixo fica como
referência pra revalidar depois de qualquer mudança de prompt ou de modelo.

O pipeline novo de imagem (images.edit com as 4 refs Sympla como grounding, logo overlay,
cache por hash) está implementado e testado mecanicamente, mas a validação visual de verdade
(3 storyboards gerados e comparados lado a lado com as refs) precisa de `OPENAI_API_KEY` e
`GEMINI_API_KEY` no `api/.env`, que não existem nesta máquina.

Como rodar a validação quando tiver as chaves:

1. `cp api/.env.example api/.env` e preencha as duas chaves.
2. `npm run dev` em `api/` e em `app/`.
3. Crie 3 apresentações pela UI (uma focused, uma balanced, uma complete) e clique em Gerar versão final.
4. Compare os PNGs de `api/generated/` com `api/assets/references/`.
5. Se não bater, o refino cirúrgico é no `MASTER_PROMPT` de `api/src/images/imagePrompt.ts`
   (máximo 3 iterações, registrar cada uma em docs/AUDIT.md). Cada mudança de prompt muda o
   hash, então regerar não conflita com o cache.

## 2. Logo vetorial oficial

O overlay usa `api/assets/logo-citi-white.png`, extraído por luminância da própria referência
de capa (resultado limpo, 175x85 com alfa). Quando o export oficial do wordmark "citi" em
branco existir, é só substituir o arquivo, nenhum código muda. Detalhe em docs/POSTPONED.md.
