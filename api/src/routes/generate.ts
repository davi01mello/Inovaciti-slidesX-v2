import { Router } from 'express';
import { generateJson, generateText } from '../llm/gemini.js';
import { llmErrorToHttp } from '../llm/errors.js';
import { logger } from '../logger.js';
import { normalizeGenerateResponse, offBandContentSlides } from '../normalize.js';
import {
  GENERATOR_SYSTEM_INSTRUCTION,
  STRATEGIST_SYSTEM_INSTRUCTION,
  buildGeneratorPrompt,
  buildStrategistPrompt,
  sanitizeStrategistPlan,
  type StrategistBriefing,
} from '../intelligence/index.js';
import { generateResponseSchema } from '../schema.js';
import { generateBodySchema, parseBody, warnIfInjectionAttempt } from '../validation.js';

export const generateRouter = Router();

/**
 * Geração em duas etapas:
 *   1. ESTRATEGISTA: recebe o briefing completo (a rota só é chamada quando o
 *      wizard termina, então aqui estão todas as respostas do usuário) e produz
 *      um único prompt interno otimizado. Essa saída jamais vai pra resposta
 *      HTTP e jamais aparece em log legível: só o tamanho, em nível debug.
 *   2. GERADORA: escreve o storyboard seguindo o plano.
 *
 * Se o estrategista falhar, a geração segue pelo caminho direto com o briefing
 * enriquecido: entregar sem plano é melhor do que não entregar.
 */
generateRouter.post('/', async (req, res) => {
  const body = parseBody(generateBodySchema, req, res);
  if (!body) return;
  warnIfInjectionAttempt(body.idea, 'generate', req.requestId);

  const briefing: StrategistBriefing = {
    idea: body.idea,
    slideCount: body.slideCount,
    goal: body.goal,
    audience: body.audience,
    style: body.style,
    assets: body.assets,
  };

  let plan: string | null = null;
  try {
    const rawPlan = await generateText({
      systemInstruction: STRATEGIST_SYSTEM_INSTRUCTION,
      prompt: buildStrategistPrompt(briefing),
    });
    plan = sanitizeStrategistPlan(rawPlan);
    logger.debug({ request_id: req.requestId, plan_chars: plan?.length ?? 0 }, 'estrategista concluído');
  } catch (err) {
    logger.warn({ request_id: req.requestId, err }, 'estrategista indisponível, geração segue pelo caminho direto');
  }

  try {
    const raw = await generateJson<unknown>({
      systemInstruction: GENERATOR_SYSTEM_INSTRUCTION,
      prompt: buildGeneratorPrompt({ plan, ...briefing }),
      responseSchema: generateResponseSchema,
    });
    const result = normalizeGenerateResponse(raw);
    if (result.slides.length === 0) {
      res.status(502).json({ error: 'O modelo não retornou slides válidos. Tenta de novo.' });
      return;
    }
    // Contagem exata é contrato com o usuário. Divergência não derruba a resposta
    // (o normalize pode ter descartado um slide malformado), mas fica visível pra gente.
    if (result.slides.length !== body.slideCount) {
      logger.warn(
        { request_id: req.requestId, requested: body.slideCount, returned: result.slides.length },
        'contagem de slides divergiu do pedido do usuário',
      );
    }
    // O ponto-chave é o alvo: nem slide vazio, nem parede de texto. Não dá pra
    // consertar aqui (mexer no conteúdo do usuário), mas dá pra enxergar no log
    // quando o prompt escorrega pra um dos extremos.
    const offBand = offBandContentSlides(result.slides);
    if (offBand.shallow.length > 0 || offBand.heavy.length > 0) {
      logger.warn(
        { request_id: req.requestId, vazios: offBand.shallow, paredes: offBand.heavy, style: body.style },
        'slides de conteúdo fora da faixa de densidade saudável',
      );
    }
    res.json(result);
  } catch (err) {
    logger.error({ request_id: req.requestId, err }, 'falha em POST /api/presentations/generate');
    const mapped = llmErrorToHttp(err, 'Falha ao gerar a apresentação. Tenta de novo em instantes.');
    if (mapped.retryAfter) res.setHeader('Retry-After', String(mapped.retryAfter));
    res.status(mapped.status).json(mapped.body);
  }
});
