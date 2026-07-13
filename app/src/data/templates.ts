import type { PresentationTemplate } from '@/types/template';

/**
 * Biblioteca de templates da CITi. Cada ideaSkeleton já passa do mínimo de caracteres
 * do wizard e usa [colchetes] pra marcar o que o usuário precisa trocar.
 */
export const TEMPLATES: PresentationTemplate[] = [
  {
    id: 'proposta-comercial',
    name: 'Proposta Comercial',
    tag: 'Comercial',
    category: 'comercial',
    description: 'Diagnóstico, proposta de valor e investimento pra fechar com um cliente novo.',
    blob: 'emerald',
    size: 'balanced',
    style: 'balanced',
    ideaSkeleton:
      'Proposta comercial da CITi para [cliente]. Contexto: [o problema que o cliente trouxe]. Nossa proposta: [solução em uma frase]. Quero mostrar o diagnóstico da dor, como a solução funciona em etapas, um case parecido da CITi e fechar com investimento e próximos passos.',
  },
  {
    id: 'pitch-produto',
    name: 'Pitch de Produto',
    tag: 'Produto',
    category: 'produto',
    description: 'Apresente um produto ou MVP com problema, solução e diferencial em poucos slides.',
    blob: 'cyan',
    size: 'focused',
    style: 'bold',
    ideaSkeleton:
      'Pitch do produto [nome] para [público-alvo]. O problema: [dor central em uma frase]. A solução: [o que o produto faz]. Diferencial: [por que é melhor que as alternativas]. Fechar com o que precisamos agora: [pedido: investimento, piloto ou parceria].',
  },
  {
    id: 'relatorio-executivo',
    name: 'Relatório Executivo',
    tag: 'Relatórios',
    category: 'relatorios',
    description: 'Resultados de um período pra diretoria: destaques, aprendizados e planos.',
    blob: 'abyss',
    size: 'balanced',
    style: 'minimal',
    ideaSkeleton:
      'Relatório executivo de [período, ex.: 2º trimestre 2026] da [área]. Principais resultados: [3 destaques com números se houver]. O que não saiu como planejado: [um ou dois pontos com aprendizado]. Prioridades do próximo período: [duas ou três frentes].',
  },
  {
    id: 'apresentacao-institucional',
    name: 'Apresentação Institucional',
    tag: 'Institucional',
    category: 'institucional',
    description: 'A CITi completa pra um público externo: quem somos, o que fazemos, provas.',
    blob: 'emerald',
    size: 'complete',
    style: 'balanced',
    ideaSkeleton:
      'Apresentação institucional da CITi para [público, ex.: empresa parceira ou evento]. Contar quem somos (empresa júnior de tecnologia e IA do CIn-UFPE), nossa missão, frentes de atuação, como trabalhamos, cases de destaque e como fazer um projeto com a gente.',
  },
  {
    id: 'roadmap-projeto',
    name: 'Roadmap de Projeto',
    tag: 'Produto',
    category: 'produto',
    description: 'Fases, entregas e marcos de um projeto pra alinhar expectativa com o cliente.',
    blob: 'violet',
    size: 'focused',
    style: 'balanced',
    ideaSkeleton:
      'Roadmap do projeto [nome] para [cliente/time]. Onde estamos: [status atual]. As fases: [fase 1: o quê e quando; fase 2: o quê e quando; fase 3: o quê e quando]. Riscos ou dependências que o cliente precisa conhecer: [liste se houver].',
  },
  {
    id: 'resultados-trimestre',
    name: 'Resultados do Trimestre',
    tag: 'Relatórios',
    category: 'relatorios',
    description: 'O trimestre em números e narrativas, do comercial ao time.',
    blob: 'cyan',
    size: 'balanced',
    style: 'bold',
    ideaSkeleton:
      'Resultados do [trimestre/ano] da CITi. Números principais: [faturamento, projetos entregues, novos clientes, os que tivermos]. História por trás dos números: [1-2 conquistas que explicam o resultado]. Time: [mudanças, crescimento]. Foco do próximo trimestre: [prioridades].',
  },
  {
    id: 'onboarding-membros',
    name: 'Onboarding de Membros',
    tag: 'Pessoas',
    category: 'pessoas',
    description: 'Boas-vindas a novos membros: cultura, estrutura e primeiros passos.',
    blob: 'abyss',
    size: 'complete',
    style: 'balanced',
    ideaSkeleton:
      'Onboarding dos novos membros da CITi [turma/período]. Boas-vindas, quem somos e nossa cultura, como a empresa se organiza (áreas e papéis), o que esperamos nos primeiros meses, ferramentas e rituais do dia a dia, e onde pedir ajuda.',
  },
  {
    id: 'case-sucesso',
    name: 'Case de Sucesso',
    tag: 'Comercial',
    category: 'comercial',
    description: 'Um projeto entregue virando prova social: desafio, solução e resultado.',
    blob: 'violet',
    size: 'focused',
    style: 'minimal',
    ideaSkeleton:
      'Case do projeto [nome] com [cliente]. O desafio que o cliente tinha: [contexto e dor]. O que a CITi construiu: [solução e abordagem]. O resultado: [impacto: números se houver, senão qualitativo]. Depoimento ou aprendizado que fecha a história: [se houver].',
  },
  {
    id: 'discovery-enterprise',
    name: 'Discovery Enterprise',
    tag: 'Comercial',
    category: 'comercial',
    description: 'Venda o mapeamento do problema antes de qualquer solução: método, entregáveis e valor.',
    blob: 'emerald',
    size: 'balanced',
    style: 'minimal',
    ideaSkeleton:
      'Proposta de Discovery Enterprise para [cliente]. O contexto: [o que o cliente quer construir ou resolver]. Por que não começar direto pela solução: partir pro desenvolvimento sem mapear o problema costuma custar [risco principal, ex.: construir a ferramenta errada]. O que o discovery entrega: imersão no processo atual, entrevistas com [quem será ouvido], mapeamento de dores e oportunidades e um relatório com recomendações priorizadas. Fechar com investimento, duração de [prazo] e próximos passos.',
  },
];

/** Os quatro em destaque na Home. */
export const FEATURED_TEMPLATES = TEMPLATES.slice(0, 4);
