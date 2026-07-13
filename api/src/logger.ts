/**
 * Logger estruturado único do processo (pino). Regra de vazamento: conteúdo de usuário
 * (idea, message, slides) nunca aparece em nível info, só em debug e nunca em produção.
 */
import { pino } from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.logLevel,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(config.isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
});
