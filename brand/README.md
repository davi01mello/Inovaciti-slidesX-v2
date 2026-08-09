# `brand/` — o mapa da identidade visual do CITi Slides

Este diretório é a fonte de verdade do sistema visual: onde a arte nasce, como ela
vira dado, e pra onde apontar quando você quer mexer em cor, prompt ou logo.

O princípio que rege tudo aqui: **MEÇA A ARTE, NÃO A ANOTE.** As zonas de texto
não são anotadas à mão. A build mede cada arte e o runtime encaixa o texto onde a
arte está vazia. É isso que faz 69 artes entrarem sem trabalho manual nenhum.

---

## O que vive aqui

```
brand/
  README.md          este mapa
  CATALOGO.md        as 69 artes com a análise medida de cada uma (GERADO)
  templates-src/     os PNGs/MP4s mestres — a fonte de verdade da arte
    Capas/           28 peças de herói (capa, separador, fecho)
    Canvas/          13 peças de miolo (escultura numa borda, vazio de sobra)
    Espiral/         18 peças de virada (textura geométrica, verde/teal)
    Diva/            10 peças de virada (mesmo papel do Espiral, paleta rosa/glam)
  tools/
    build_templates.py   o pipeline: mede as artes e gera o catálogo tipado
```

Fundo pode ser estático (PNG) ou animado (MP4 → WebP animado, medido pelo frame do
meio). Pro app isso é invisível: o catálogo só tem um campo `animated`, e um WebP
animado dentro de `<img>` já anima sozinho em qualquer navegador moderno.

## Adicionar uma arte nova

1. Jogue o PNG (16:9, qualquer resolução) — ou o MP4, pra fundo com movimento — em
   `brand/templates-src/<Familia>/`. Família nova? Só criar a pasta e registrar em
   `FAMILIES` no topo de `build_templates.py` (o tipo `ArtFamily` do catálogo é
   gerado a partir dali, não precisa editar TypeScript à mão).
2. Rode o pipeline:
   ```bash
   python3 brand/tools/build_templates.py
   ```
3. Acabou. O script converte pra WebP, mede matiz/luminância/ocupação/tom, e
   reescreve o catálogo. A arte já entra no sorteio do diretor de arte.

Nada de anotar zona à mão. Nada de editar TypeScript. `--report` mede sem escrever.

Se a arte nova tiver aptidão diferente das existentes na família (ex: uma família
nova que deveria funcionar melhor como capa do que como virada), ajuste também
`FAMILY_FIT` em `app/src/services/deckArt.ts` — é o que decide, por arquétipo de
slide, quanto cada família "combina" com aquele papel.

---

## Onde está cada coisa (o resto do sistema)

O `brand/` é o coração, mas o sistema visual se espalha por arquivos que **não**
podem morar aqui (o Vite os importa de `app/src`, o Node de `api/src`). Este é o
mapa pra achar cada um:

| O que você quer mexer | Onde |
| --- | --- |
| **As artes** (fonte) | `brand/templates-src/` |
| As artes (otimizadas, geradas) | `app/src/assets/templates/<familia>/` |
| O **catálogo medido** (gerado) | `app/src/services/templateArt.generated.ts` |
| O **pipeline** de build | `brand/tools/build_templates.py` |
| O **eixo de cor** (Névoa/Oceano/Floresta, OKLab) | `app/src/services/tone.ts` |
| O **motor de zonas** (mede a arte, escolhe o arranjo) | `app/src/services/artZones.ts` |
| O **diretor de arte** (monta o deck inteiro) | `app/src/services/deckArt.ts` |
| A **composição** do slide (desenha) | `app/src/components/present/SlideComposition.tsx` |
| Os **prompts de IA** (todos, num lugar só) | `api/src/intelligence/` |
| Os **logos** da marca | `app/src/assets/logos/` |
| Os **logos de empresa** (cases/alumni/parceiros) | `app/src/assets/company-logos/<categoria>/` |
| Os **elementos** 3D (blobs) | `app/src/assets/elements/<cor>/` |
| Os **ícones** (pictogramas) | `app/src/assets/icons/<categoria>/` |
| O **harness** visual (pra OLHAR os slides) | `app/harness.html` |

**Limitação conhecida do eixo de cor**: `tone.ts` foi calibrado pro verde da marca
(Névoa branco → Oceano azul → Floresta verde). Uma família fora desse espectro (a
Diva, rosa) mede tom perto de 0 (Névoa) pra praticamente toda peça — o diretor de
arte ainda funciona (a família entra pelo filtro manual da aba Fundos sem problema),
só não tem posição própria no slider de tom automático. Dar à Diva um eixo de cor de
verdade é trabalho pra depois, não bug.

### Os prompts de IA

Todos os prompts vivem em `api/src/intelligence/`, e nenhum prompt vive fora dali:

```
api/src/intelligence/
  writing.ts      a fundação: identidade, densidade (pontos-chave), regras de forma
  templates.ts    specs de objetivo e de voz
  strategist.ts   o Estrategista (briefing -> plano interno)
  generator.ts    a Geradora (plano -> JSON dos slides)
  chat.ts         o assistente do workspace
  improve.ts      a reescrita de um slide
```

A regra de densidade mais importante: **slide é pontos-chave, não parede de texto
nem cartaz vazio.** 25 a 70 palavras por slide, favorecendo cards e tópicos.
