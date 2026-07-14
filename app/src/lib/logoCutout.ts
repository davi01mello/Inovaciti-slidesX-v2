/**
 * REMOÇÃO DE FUNDO DO LOGO.
 *
 * O usuário anexa o logo da empresa dele, quase sempre um PNG/JPG com fundo branco.
 * Colado num slide preto, um retângulo branco em volta do logo é o detalhe que
 * denuncia que a apresentação foi montada às pressas.
 *
 * O ALGORITMO, e por que não é um simples "tudo que é branco vira transparente":
 *
 * Um "apague o branco" global perfura o DESENHO: o miolo do "o", o vão do "A", o
 * branco dentro de um símbolo. É fundo o que tem a cor do fundo E TEM CAMINHO ATÉ A
 * MOLDURA. Então isto é um flood-fill a partir das quatro bordas: só o que a água
 * alcança vindo de fora vira transparente. Os vãos fechados de dentro do desenho
 * sobrevivem, porque a água não chega neles.
 *
 * Três coisas que quase todo recorte caseiro erra e que estão resolvidas aqui:
 *
 * ANTIALIAS   a transparência é GRADUAL dentro da faixa de tolerância. Um corte
 *             binário (dentro/fora) devolve as letras com a borda serrilhada, e
 *             serrilhado num logo aparece a três metros de distância.
 *
 * HONESTIDADE se os quatro cantos não concordam numa cor (uma foto, um logo sobre
 *             gradiente), NÃO EXISTE cor de fundo. Aí o certo é não fazer nada e
 *             avisar. Melhor a imagem intacta do que um recorte esburacado fingindo
 *             que deu certo.
 *
 * O AVISO QUE  se o recorte deu certo mas o que sobrou é ESCURO, o logo vai SUMIR no
 * NINGUÉM DÁ   slide escuro. Isso não é erro do recorte, é uma consequência que só
 *              aparece depois. A luminância do que restou é medida e a pessoa fica
 *              sabendo AGORA, não na frente do cliente.
 */

export interface LogoCutout {
  /** PNG transparente. Igual à entrada quando `applied` é false. */
  dataUrl: string;
  width: number;
  height: number;
  /** true = o fundo foi removido. false = a imagem voltou intacta. */
  applied: boolean;
  /** O que aconteceu, em português, pra mostrar pra pessoa. Vazio = nada a dizer. */
  notice: string;
  /** Luminância média do que sobrou (0..1). Só faz sentido quando applied. */
  inkLuminance: number;
}

/** Distância dentro da qual o pixel É fundo. Acima de FEATHER ele é 100% desenho. */
const TOLERANCE = 30;
/** A faixa de antialias: entre TOLERANCE e FEATHER o alfa cai suavemente. */
const FEATHER = 74;

/** Um canto discorda dos outros acima disso: não há cor de fundo. */
const CORNER_AGREEMENT = 38;

/** Abaixo disso, o que sobrou é escuro e vai sumir num slide escuro. */
const DARK_INK = 0.42;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function dist(a: Rgb, b: Rgb): number {
  // Euclidiana em sRGB serve aqui: a pergunta é "é a MESMA cor?", não "quanto mais
  // escura?". Pra identidade, sRGB basta e é barato.
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/** A cor média de um bloco do canto — um pixel só pega ruído de compressão. */
function cornerColor(data: Uint8ClampedArray, w: number, h: number, cx: number, cy: number): Rgb {
  const side = Math.max(2, Math.round(Math.min(w, h) * 0.04));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = cy; y < cy + side && y < h; y++) {
    for (let x = cx; x < cx + side && x < w; x++) {
      const i = (y * w + x) * 4;
      r += data[i]!;
      g += data[i + 1]!;
      b += data[i + 2]!;
      n++;
    }
  }
  return n === 0 ? { r: 255, g: 255, b: 255 } : { r: r / n, g: g / n, b: b / n };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function cutoutLogoBackground(source: HTMLImageElement | HTMLCanvasElement, width: number, height: number): LogoCutout {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { dataUrl: '', width, height, applied: false, notice: 'Canvas indisponível neste navegador.', inkLuminance: 0 };
  }
  ctx.drawImage(source, 0, 0, width, height);

  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;

  // 1. OS QUATRO CANTOS PRECISAM CONCORDAR. Se não concordam, não há fundo.
  const inset = Math.round(Math.min(width, height) * 0.02);
  const side = Math.max(2, Math.round(Math.min(width, height) * 0.04));
  const corners = [
    cornerColor(data, width, height, inset, inset),
    cornerColor(data, width, height, width - inset - side, inset),
    cornerColor(data, width, height, inset, height - inset - side),
    cornerColor(data, width, height, width - inset - side, height - inset - side),
  ];
  const avg: Rgb = {
    r: corners.reduce((s, c) => s + c.r, 0) / 4,
    g: corners.reduce((s, c) => s + c.g, 0) / 4,
    b: corners.reduce((s, c) => s + c.b, 0) / 4,
  };
  const disagreement = Math.max(...corners.map((c) => dist(c, avg)));

  if (disagreement > CORNER_AGREEMENT) {
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width,
      height,
      applied: false,
      notice:
        'Os cantos dessa imagem têm cores diferentes, então ela não tem um fundo liso pra remover. Deixei a imagem como estava: um recorte aqui sairia esburacado.',
      inkLuminance: 0,
    };
  }

  // 2. FLOOD-FILL a partir das bordas. É fundo o que tem a cor do fundo E chega até a moldura.
  const alpha = new Float32Array(width * height).fill(1);
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    visited[p] = 1;
    queue.push(p);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  let cut = 0;
  while (queue.length > 0) {
    const p = queue.pop()!;
    const i = p * 4;
    const px: Rgb = { r: data[i]!, g: data[i + 1]!, b: data[i + 2]! };
    const d = dist(px, avg);

    if (d > FEATHER) continue; // desenho de verdade: a água para aqui

    // ANTIALIAS: dentro da tolerância é fundo puro (alfa 0); na faixa de pena, o alfa
    // sobe suave até 1. É esta rampa que devolve a borda da letra lisa em vez de
    // serrilhada.
    const a = d <= TOLERANCE ? 0 : (d - TOLERANCE) / (FEATHER - TOLERANCE);
    if (a < alpha[p]!) alpha[p] = a;
    if (a === 0) cut++;

    // A água só continua a partir do que é fundo puro: se ela avançasse pela faixa de
    // pena, um degradê suave dentro do desenho viraria uma porta de entrada e a água
    // vazaria pro miolo do logo.
    if (a > 0) continue;

    const x = p % width;
    const y = (p - x) / width;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // Praticamente nada foi cortado: a imagem já era transparente, ou o fundo não é liso.
  if (cut < width * height * 0.02) {
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width,
      height,
      applied: false,
      notice: '',
      inkLuminance: 0,
    };
  }

  // 3. Aplica o alfa e mede o que SOBROU.
  let inkLum = 0;
  let inkWeight = 0;
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const a = alpha[p]!;
    data[i + 3] = Math.round(data[i + 3]! * a);
    if (a > 0.5) {
      const w = a;
      inkLum += relativeLuminance({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! }) * w;
      inkWeight += w;
    }
  }
  ctx.putImageData(image, 0, 0);

  const inkLuminance = inkWeight > 0 ? inkLum / inkWeight : 0;

  // 4. O AVISO QUE NINGUÉM LEMBRA DE DAR.
  const notice =
    inkLuminance < DARK_INK
      ? 'Removi o fundo, mas o logo que sobrou é escuro: nos slides escuros ele vai sumir. Se você tiver uma versão clara ou monocromática branca do logo, use ela.'
      : '';

  return { dataUrl: canvas.toDataURL('image/png'), width, height, applied: true, notice, inkLuminance };
}

/** Carrega o File e devolve o logo já recortado, no tamanho que o slide usa. */
export async function fileToLogoCutout(file: File, maxDim = 640): Promise<LogoCutout> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Não consegui ler "${file.name}".`));
      el.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    return cutoutLogoBackground(img, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}
