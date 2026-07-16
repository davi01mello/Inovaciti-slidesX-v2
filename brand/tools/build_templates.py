#!/usr/bin/env python3
"""
O PIPELINE DE ARTES DO CITi SLIDES.

Este script é a razão de existirem 38 artes em vez de 4. O sistema antigo tinha
as zonas de texto ANOTADAS À MÃO, uma por uma, e é por isso que ele nunca passou
de quatro fundos: ninguém vai anotar 38 artes x 9 arquétipos na mão.

Aqui a máquina MEDE a arte:

  1. converte o PNG mestre em WebP 1600x900 (a arte fecha em ~40KB);
  2. mede uma GRADE DE OCUPAÇÃO 16x9 -- o quanto cada célula do slide está
     "ocupada" visualmente (0 = vazio liso, 99 = escultura ou facho de luz);
  3. mede matiz, luminância e deriva o `tone` (a posição da arte no eixo de cor);
  4. emite um catálogo TIPADO (templateArt.generated.ts) e um CATALOGO.md legível.

Em runtime, cada arquétipo propõe vários arranjos possíveis e o motor pontua cada
um contra a grade daquela arte (ver app/src/services/artZones.ts). O texto nunca
cai em cima da escultura, e a mesma arte muda de arranjo conforme o arquétipo.

Arte nova entra sozinha: joga o PNG (fundo estático) OU o MP4 (fundo com
movimento -- vira WebP animado, medido pelo frame do meio) em
brand/templates-src/<Familia>/ e roda:

    python3 brand/tools/build_templates.py

Uso:
    python3 brand/tools/build_templates.py            # build completo
    python3 brand/tools/build_templates.py --report   # só mede e imprime (não escreve nada)
"""

from __future__ import annotations

import math
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

# ---------------------------------------------------------------------------
# Caminhos
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = ROOT / "brand" / "templates-src"
OUT_ART_DIR = ROOT / "app" / "src" / "assets" / "templates"
OUT_TS = ROOT / "app" / "src" / "services" / "templateArt.generated.ts"
OUT_MD = ROOT / "brand" / "CATALOGO.md"

# Pasta de origem -> família do catálogo. A família diz o PAPEL da arte no deck
# (ver aptidão de família no diretor de arte), não só onde o arquivo mora.
FAMILIES = {
    "Capas": "capa",       # peça de herói: cheia, dramática, feita pra UM bloco de texto grande
    "Canvas": "canvas",    # peça de miolo: escultura numa borda, vazio de sobra pro conteúdo denso
    "Espiral": "espiral",  # peça de virada: textura geométrica, ótima pra separador
}

# ---------------------------------------------------------------------------
# Formato de saída
# ---------------------------------------------------------------------------

ART_W, ART_H = 1600, 900
WEBP_QUALITY = 80
GRID_COLS, GRID_ROWS = 16, 9

# ---------------------------------------------------------------------------
# Vídeo -> WebP animado (fundos com movimento, ex: os blobs da marca)
# ---------------------------------------------------------------------------
#
# Mesmo tratamento de sempre (cover_crop + measure), só que a "arte" que sai no
# catálogo é um WebP ANIMADO em vez de estático. Pro app isto é invisível: o
# campo `src` continua uma string apontando pra um .webp, e todo navegador
# moderno já anima um WebP animado dentro de uma <img> normal — zero mudança
# no renderizador (ver components/present/SlideComposition.tsx).
#
# A GRADE, o matiz, a luminância etc. são medidos num único FRAME REPRESENTATIVO
# (o do meio do clipe), pelo mesmo motivo que uma arte estática usa um frame
# só: o motor de zonas precisa de UMA leitura estável, não de 80.
VIDEO_EXTS = {".mp4"}
VIDEO_FPS = 8
VIDEO_QUALITY = 72
# Nível 3: o ponto de equilíbrio medido. Nível 0 sai maior; nível 6 (o mais
# compacto) pode levar minutos num clipe gradiente como estes blobs de vidro.
VIDEO_COMPRESSION_LEVEL = 3

# ---------------------------------------------------------------------------
# Eixo de cor (SYNC_WITH: app/src/services/tone.ts)
# ---------------------------------------------------------------------------
#
#   0.0 ──────────── 0.5 ──────────── 1.0
#   Névoa           Oceano          Floresta
#   #E8F6F1         #2DAEDB         #2DDB60
#
# Os DOIS polos coloridos, ancorados no MATERIAL e não no hex da marca.
#
# O hex do verde CITi (#2DDB60) tem matiz 137°. Nenhuma arte chega perto disso:
# medindo as 38, o vidro mais verde da coleção dá 158° e o mais azul dá 199° — as
# esculturas são vidro esmeralda e vidro oceano, não tinta chapada. Ancorar no
# hex teórico espremeria TODOS os verdes na faixa 0.71..0.82 e a ponta Floresta
# do eixo nunca seria alcançada por arte nenhuma. Os âncoras abaixo são o que a
# coleção de fato contém, então o eixo inteiro é usado de ponta a ponta.
HUE_OCEANO = 197.0    # o vidro mais azul da coleção
HUE_FLORESTA = 160.0  # o vidro mais verde da coleção


# ---------------------------------------------------------------------------
# Colorimetria
# ---------------------------------------------------------------------------


def linearize(srgb: np.ndarray) -> np.ndarray:
    """sRGB (0..1) -> luz linear. Sem isso, somar canais é somar números que não são luz."""
    return np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)


def lightness(rgb: np.ndarray) -> np.ndarray:
    """
    L* do CIE Lab (0..100), não a luminância linear.

    Esta escolha é o coração da medição. Estas artes são QUASE TODAS pretas: em
    luz linear, um brilho suave sobre preto vale ~0.02 e o desvio padrão de uma
    célula com um facho de luz sairia praticamente igual ao de uma célula vazia.
    L* expande os escuros do mesmo jeito que o olho expande — e é o olho que vai
    julgar se o texto é legível ali.
    """
    y = linearize(rgb) @ np.array([0.2126, 0.7152, 0.0722])
    return np.where(y > 0.008856, 116.0 * np.cbrt(y) - 16.0, 903.3 * y)


def chroma(rgb: np.ndarray) -> np.ndarray:
    """
    "Cor viva" da célula (0..100): croma = max(R,G,B) - min(R,G,B).

    ARMADILHA que isto evita: a saturação de HSV é uma RAZÃO ((max-min)/max), e
    num pixel quase preto ela explode — o pixel (2,3,1) tem saturação 0.67. Usar
    HSV aqui pintaria o preto liso do fundo como "cheio de cor" e o motor fugiria
    justamente das áreas onde o texto cabe melhor. Croma é diferença absoluta:
    no preto ela é zero, no brilho verde da escultura ela é enorme. É o que a
    palavra "viva" de fato quer dizer.
    """
    return (rgb.max(axis=-1) - rgb.min(axis=-1)) * 100.0


def hue_degrees(rgb: np.ndarray) -> np.ndarray:
    """Matiz em graus (0..360), no mesmo espaço do HSV."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    d = mx - mn
    h = np.zeros_like(mx)
    safe = d > 1e-6
    # Cada ramo do HSV, calculado só onde o canal é o máximo.
    ri = safe & (mx == r)
    gi = safe & (mx == g) & ~ri
    bi = safe & (mx == b) & ~ri & ~gi
    with np.errstate(invalid="ignore", divide="ignore"):
        h[ri] = (60.0 * ((g[ri] - b[ri]) / d[ri])) % 360.0
        h[gi] = 60.0 * ((b[gi] - r[gi]) / d[gi]) + 120.0
        h[bi] = 60.0 * ((r[bi] - g[bi]) / d[bi]) + 240.0
    return h


# ---------------------------------------------------------------------------
# Medição de uma arte
# ---------------------------------------------------------------------------


@dataclass
class ArtMeasurement:
    grid: list[int]        # 144 células (16x9), 0..99
    hue: float             # matiz dominante, graus
    luminance: float       # L* médio normalizado 0..1
    vividness: float       # croma médio 0..1 (o quanto a arte TEM cor)
    tone: float            # posição no eixo de cor, 0..1
    light: bool            # arte de fundo claro (o texto precisa ser escuro)


def occupancy_grid(lab_l: np.ndarray, chr_: np.ndarray) -> list[int]:
    """
    A GRADE DE OCUPAÇÃO: o quanto cada uma das 144 células está visualmente cheia.

        ocupação = desvio_padrão_da_luminância * 2.6 + croma_médio * 0.7

    Contraste local + cor viva. As duas parcelas existem por motivos diferentes:

    - O DESVIO PADRÃO pega a ESTRUTURA. Uma célula meio preta e meio iluminada
      tem desvio enorme, e é exatamente ali que uma linha de texto morre: metade
      das letras some no brilho. Uma célula uniforme (preta OU branca) tem desvio
      zero e aceita texto sem reclamar.
    - O CROMA pega a COR. Um verde chapado forte tem desvio baixo (é uniforme)
      mas briga com o texto assim mesmo. Só o desvio deixaria passar.
    """
    h, w = lab_l.shape
    cell_h, cell_w = h // GRID_ROWS, w // GRID_COLS
    out: list[int] = []
    for row in range(GRID_ROWS):
        for col in range(GRID_COLS):
            y0, y1 = row * cell_h, (row + 1) * cell_h
            x0, x1 = col * cell_w, (col + 1) * cell_w
            l_cell = lab_l[y0:y1, x0:x1]
            c_cell = chr_[y0:y1, x0:x1]
            occ = float(l_cell.std()) * 2.6 + float(c_cell.mean()) * 0.7
            out.append(int(min(99.0, max(0.0, round(occ)))))
    return out


def dominant_hue(hue: np.ndarray, chr_: np.ndarray, lab_l: np.ndarray) -> float:
    """
    Matiz da arte: média CIRCULAR dos pixels que de fato carregam cor, pesada por
    croma x luminância — é o brilho da escultura que define a identidade da arte,
    não os milhões de pixels pretos do fundo (que têm matiz aleatório e nenhuma cor).

    Média circular e não aritmética porque matiz é um ângulo: a média entre 350°
    e 10° é 0°, não 180°.
    """
    weight = (chr_ / 100.0) * (lab_l / 100.0)
    weight = np.where(chr_ > 8.0, weight, 0.0)  # abaixo disso é ruído de compressão, não cor
    total = float(weight.sum())
    if total < 1e-6:
        return HUE_FLORESTA  # arte sem cor nenhuma: neutra, deixa o eixo decidir pela névoa
    rad = np.deg2rad(hue)
    x = float((np.cos(rad) * weight).sum()) / total
    y = float((np.sin(rad) * weight).sum()) / total
    return math.degrees(math.atan2(y, x)) % 360.0


def derive_tone(hue: float, luminance: float, vividness: float) -> tuple[float, float]:
    """
    O `tone`: onde esta arte cai no eixo Névoa -> Oceano -> Floresta.

    Duas forças, porque o eixo tem duas naturezas. De 0.5 a 1.0 ele é MATIZ (o
    vidro oceano virando vidro esmeralda). De 0.5 a 0.0 ele NÃO é matiz: é LUZ.
    Branco gelo não tem matiz pra medir. O que separa a Névoa do resto é a arte
    ser clara.

    ARMADILHA que quase me pegou: a primeira versão media "névoa" como
    "clara E sem cor", achando que o branco seria lavado. Medindo, a arte branca
    tem croma 0.24 — MAIS cor que qualquer arte escura da coleção (0.03 a 0.17),
    porque hortelã sobre branco tem cor de verdade enquanto preto-com-brilho é
    quase tudo preto. Croma como sinal de névoa estava de cabeça pra baixo.
    Névoa é claridade, ponto.

    Devolve (tone, mist) — mist fica no relatório pra dar pra auditar a decisão.
    """
    # Matiz -> metade colorida do eixo. 197° (Oceano) = 0.5, 160° (Floresta) = 1.0.
    span = HUE_OCEANO - HUE_FLORESTA
    hue_tone = 0.5 + 0.5 * (HUE_OCEANO - hue) / span
    hue_tone = min(1.0, max(0.40, hue_tone))  # roxo/ciano puro ainda ancoram no Oceano

    # A névoa é pura claridade: L* médio de 0.35 pra cima já começa a puxar, e a
    # partir de 0.65 a arte É o polo branco do eixo.
    mist = min(1.0, max(0.0, (luminance - 0.35) / 0.30))

    tone = hue_tone * (1.0 - mist)
    return round(min(1.0, max(0.0, tone)), 3), round(mist, 3)


def measure(art: Image.Image) -> ArtMeasurement:
    rgb = np.asarray(art, dtype=np.float32) / 255.0
    lab_l = lightness(rgb)
    chr_ = chroma(rgb)
    hue = hue_degrees(rgb)

    grid = occupancy_grid(lab_l, chr_)
    dom_hue = dominant_hue(hue, chr_, lab_l)
    luminance = float(lab_l.mean()) / 100.0
    vividness = float(chr_.mean()) / 100.0
    tone, _mist = derive_tone(dom_hue, luminance, vividness)

    return ArtMeasurement(
        grid=grid,
        hue=round(dom_hue, 1),
        luminance=round(luminance, 3),
        vividness=round(vividness, 3),
        tone=tone,
        # Arte clara: o texto branco padrão SOME nela. O runtime vira a tinta pro
        # escuro e escolhe o acento profundo (ver tone.ts / composeArt).
        light=luminance > 0.55,
    )


# ---------------------------------------------------------------------------
# Imagem
# ---------------------------------------------------------------------------


def cover_crop(img: Image.Image, ratio: float = ART_W / ART_H) -> Image.Image:
    """Corta pro 16:9 pelo centro. Uma das artes vem 3:2 e sem isso ela sairia esmagada."""
    w, h = img.size
    if abs(w / h - ratio) < 0.001:
        return img
    if w / h > ratio:  # larga demais: corta as laterais
        new_w = int(round(h * ratio))
        x0 = (w - new_w) // 2
        return img.crop((x0, 0, x0 + new_w, h))
    new_h = int(round(w / ratio))  # alta demais: corta topo e base
    y0 = (h - new_h) // 2
    return img.crop((0, y0, w, y0 + new_h))


def slugify(stem: str) -> str:
    """fundoCapa01 -> capa-01 · fundoCanvaLeft02 -> canva-left-02 · fundEspiralBranco01 -> espiral-branco-01"""
    name = re.sub(r"^fundo?", "", stem)
    parts = re.findall(r"[A-Z][a-z]*|\d+", name)
    return "-".join(p.lower() for p in parts)


def video_duration(path: Path) -> float:
    """Duração do clipe em segundos, via ffprobe."""
    out = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def video_representative_frame(path: Path) -> Image.Image:
    """
    O FRAME QUE REPRESENTA O CLIPE inteiro pro medidor de cor e de grade.

    Pega o frame do MEIO (não o primeiro): num loop que nasce de um estado
    neutro e "infla" até a pose cheia, o primeiro frame costuma ser o menos
    representativo do que a arte realmente parece na tela.
    """
    duration = video_duration(path)
    with tempfile.TemporaryDirectory() as tmp:
        out_path = Path(tmp) / "frame.png"
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error",
                "-ss", str(duration / 2.0),
                "-i", str(path),
                "-vframes", "1",
                str(out_path),
            ],
            check=True,
        )
        return Image.open(out_path).convert("RGB")


def encode_animated_webp(path: Path, out: Path) -> None:
    """
    Vídeo -> WebP animado, em duas passadas.

    Uma única chamada ffmpeg fazendo decode + escala + encode WebP junto é
    lenta demais pro conteúdo gradiente destas artes (o encoder WebP é o
    gargalo, não a decodificação). Separar em duas passadas -- primeiro os
    frames como PNG, depois o encode WebP a partir deles -- é várias vezes
    mais rápido pro mesmo resultado.
    """
    with tempfile.TemporaryDirectory() as tmp:
        pattern = Path(tmp) / "f_%03d.png"
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error",
                "-i", str(path),
                "-vf", f"scale={ART_W}:{ART_H}:flags=lanczos,fps={VIDEO_FPS}",
                str(pattern),
            ],
            check=True,
        )
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error",
                "-framerate", str(VIDEO_FPS),
                "-i", str(pattern),
                "-loop", "0",
                "-q:v", str(VIDEO_QUALITY),
                "-compression_level", str(VIDEO_COMPRESSION_LEVEL),
                "-an",
                str(out),
            ],
            check=True,
        )


# ---------------------------------------------------------------------------
# Saída
# ---------------------------------------------------------------------------


@dataclass
class ArtRecord:
    id: str
    family: str
    file: str
    m: ArtMeasurement


def render_grid_ascii(grid: list[int]) -> list[str]:
    """A grade como desenho: dá pra VER a escultura na tabela do catálogo."""
    ramp = " .:-=+*#%@"
    lines = []
    for row in range(GRID_ROWS):
        cells = grid[row * GRID_COLS : (row + 1) * GRID_COLS]
        lines.append("".join(ramp[min(len(ramp) - 1, c * len(ramp) // 100)] * 2 for c in cells))
    return lines


def emit_ts(records: list[ArtRecord]) -> str:
    imports = "\n".join(
        f"import art_{r.id.replace('-', '_')} from '@/assets/templates/{r.family}/{r.id}.webp';"
        for r in records
    )
    entries = []
    for r in records:
        rows = ",\n      ".join(
            ", ".join(f"{v:2d}" for v in r.m.grid[i * GRID_COLS : (i + 1) * GRID_COLS])
            for i in range(GRID_ROWS)
        )
        entries.append(
            f"""  {{
    id: '{r.id}',
    family: '{r.family}',
    src: art_{r.id.replace('-', '_')},
    hue: {r.m.hue},
    luminance: {r.m.luminance},
    vividness: {r.m.vividness},
    tone: {r.m.tone},
    light: {'true' if r.m.light else 'false'},
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
      {rows},
    ],
  }},"""
        )
    body = "\n".join(entries)
    return f"""/* eslint-disable */
/**
 * CATÁLOGO DE ARTES DA MARCA — GERADO. NÃO EDITE À MÃO.
 *
 * Fonte: brand/templates-src/  ·  Gerador: brand/tools/build_templates.py
 * Pra adicionar uma arte: jogue o PNG (ou MP4, pra fundo com movimento) em
 * brand/templates-src/<Familia>/ e rode
 *
 *     python3 brand/tools/build_templates.py
 *
 * `grid` é a grade de ocupação 16x9 medida na própria arte: 0 = vazio liso,
 * 99 = escultura ou facho de luz. É contra ela que o motor de zonas pontua cada
 * arranjo possível de cada arquétipo (ver services/artZones.ts).
 */
{imports}

export type ArtFamily = 'capa' | 'canvas' | 'espiral';

export interface TemplateArt {{
  id: string;
  family: ArtFamily;
  src: string;
  /** Matiz dominante da escultura, em graus. */
  hue: number;
  /** L* médio da arte (0..1). */
  luminance: number;
  /** Croma médio (0..1): o quanto a arte TEM cor. */
  vividness: number;
  /** Posição no eixo de cor: 0 = Névoa, 0.5 = Oceano, 1 = Floresta. */
  tone: number;
  /** Arte de fundo claro: a tinta do slide vira escura e o acento vira o profundo. */
  light: boolean;
  /** Ocupação visual, 16 colunas x 9 linhas, em ordem de leitura (0..99). */
  grid: number[];
}}

export const GRID_COLS = {GRID_COLS};
export const GRID_ROWS = {GRID_ROWS};

export const TEMPLATE_ARTS: TemplateArt[] = [
{body}
];
"""


def emit_md(records: list[ArtRecord]) -> str:
    lines = [
        "# Catálogo de artes",
        "",
        "**Gerado por `brand/tools/build_templates.py`. Não edite à mão.**",
        "",
        "Cada arte é medida na build: matiz, luminância, croma, e uma grade de ocupação",
        "16x9 que diz o quanto cada pedaço do slide está visualmente cheio. O motor de",
        "zonas usa essa grade pra escolher, em runtime, onde o texto cabe naquela arte",
        "(`app/src/services/artZones.ts`) — nenhuma zona é anotada à mão.",
        "",
        "O desenho ao lado de cada arte É a grade medida: os blocos escuros são o vazio",
        "onde o texto cabe, os claros são a escultura.",
        "",
        f"**{len(records)} artes.**",
        "",
        "| id | família | tone | matiz | lum | croma | clara |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for r in records:
        lines.append(
            f"| `{r.id}` | {r.family} | {r.m.tone:.2f} | {r.m.hue:.0f}° | "
            f"{r.m.luminance:.2f} | {r.m.vividness:.2f} | {'sim' if r.m.light else '–'} |"
        )
    lines += ["", "---", ""]
    for r in records:
        band = tone_band(r.m.tone)
        lines += [
            f"### `{r.id}`",
            "",
            f"{r.file} · família **{r.family}** · tone **{r.m.tone:.2f}** ({band}) · "
            f"matiz {r.m.hue:.0f}° · luminância {r.m.luminance:.2f}"
            + (" · **arte clara**" if r.m.light else ""),
            "",
            "```",
            *render_grid_ascii(r.m.grid),
            "```",
            "",
        ]
    return "\n".join(lines)


def tone_band(tone: float) -> str:
    if tone < 0.34:
        return "Névoa"
    if tone < 0.72:
        return "Oceano"
    return "Floresta"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def sorted_sources(src: Path) -> list[Path]:
    """PNGs (fundos estáticos) e MP4s (fundos com movimento), juntos e em ordem."""
    paths = list(src.glob("*.png")) + [p for p in src.glob("*") if p.suffix.lower() in VIDEO_EXTS]
    return sorted(paths, key=lambda p: p.name)


def measured_still(path: Path) -> Image.Image:
    """A imagem 1600x900 já cortada, pronta pro medidor -- de um PNG ou do frame do meio de um vídeo."""
    if path.suffix.lower() in VIDEO_EXTS:
        img = video_representative_frame(path)
    else:
        img = Image.open(path).convert("RGB")
    return cover_crop(img).resize((ART_W, ART_H), Image.LANCZOS)


def collect() -> list[ArtRecord]:
    records: list[ArtRecord] = []
    for folder, family in FAMILIES.items():
        src = SRC_DIR / folder
        if not src.is_dir():
            print(f"  aviso: {src} não existe, pulando")
            continue
        for path in sorted_sources(src):
            art = measured_still(path)
            records.append(
                ArtRecord(id=slugify(path.stem), family=family, file=path.name, m=measure(art))
            )
    return records


def build(report_only: bool) -> int:
    if not SRC_DIR.is_dir():
        print(f"erro: {SRC_DIR} não existe.", file=sys.stderr)
        return 1

    records: list[ArtRecord] = []
    total_bytes = 0

    for folder, family in FAMILIES.items():
        src = SRC_DIR / folder
        if not src.is_dir():
            continue
        out_dir = OUT_ART_DIR / family
        if not report_only:
            out_dir.mkdir(parents=True, exist_ok=True)

        for path in sorted_sources(src):
            is_video = path.suffix.lower() in VIDEO_EXTS
            art = measured_still(path)
            art_id = slugify(path.stem)
            m = measure(art)

            if not report_only:
                out = out_dir / f"{art_id}.webp"
                if is_video:
                    encode_animated_webp(path, out)
                else:
                    art.save(out, "WEBP", quality=WEBP_QUALITY, method=6)
                total_bytes += out.stat().st_size

            records.append(ArtRecord(id=art_id, family=family, file=path.name, m=m))
            print(
                f"  {art_id:<20} {family:<8} tone {m.tone:.2f} ({tone_band(m.tone):<8}) "
                f"matiz {m.hue:5.1f}°  lum {m.luminance:.2f}  croma {m.vividness:.2f}"
                f"{'  [CLARA]' if m.light else ''}"
                f"{'  [ANIMADA]' if is_video else ''}"
            )

    if not records:
        print("erro: nenhuma arte encontrada.", file=sys.stderr)
        return 1

    if report_only:
        print(f"\n{len(records)} artes medidas (nada foi escrito).")
        return 0

    OUT_TS.write_text(emit_ts(records), encoding="utf-8")
    OUT_MD.write_text(emit_md(records), encoding="utf-8")

    avg_kb = total_bytes / len(records) / 1024
    print(
        f"\n{len(records)} artes  ·  {total_bytes / 1024 / 1024:.1f} MB no total  "
        f"·  {avg_kb:.0f} KB por arte"
    )
    print(f"  → {OUT_TS.relative_to(ROOT)}")
    print(f"  → {OUT_MD.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(build(report_only="--report" in sys.argv))
