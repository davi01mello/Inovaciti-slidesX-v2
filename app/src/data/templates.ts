import type { PresentationTemplate } from '@/types/template';

/**
 * Biblioteca de templates da CITi.
 *
 * O ideaSkeleton é o coração de cada template, porque é literalmente o texto que
 * a IA vai ler. A versão anterior entregava duas linhas de contexto, e duas
 * linhas produzem uma apresentação genérica por melhor que seja o motor. Agora
 * cada esqueleto carrega a narrativa inteira daquele tipo de deck: o que abre, o
 * que sustenta, o que prova, o que fecha, com [colchetes] marcando exatamente o
 * que a pessoa precisa preencher.
 */
export const TEMPLATES: PresentationTemplate[] = [
  {
    id: 'proposta-comercial',
    name: 'Proposta Comercial',
    tag: 'Comercial',
    category: 'comercial',
    description: 'Diagnóstico, proposta de valor e investimento pra fechar com um cliente novo.',
    blob: 'emerald',
    goal: 'convince',
    slideCount: 10,
    style: 'balanced',
    ideaSkeleton: `Proposta comercial da CITi para [cliente], do setor de [segmento].

Contexto: o [cliente] procurou a gente porque [situação que motivou a conversa]. Hoje eles [como o processo funciona atualmente].

O problema central: [a dor principal, com a consequência concreta que ela gera, por exemplo perda de tempo, de receita ou de clientes].

Nossa proposta: [a solução em uma frase]. Ela funciona assim: [etapa 1], depois [etapa 2], e por fim [etapa 3].

Por que a CITi: [o que nos torna a escolha certa aqui, com um projeto parecido que já entregamos e o resultado dele].

Objeção mais provável: [a dúvida que eles vão levantar, por exemplo prazo, preço ou risco]. Como respondemos: [a resposta].

Investimento e prazo: [valor e duração]. O próximo passo que quero deles: [reunião, aprovação ou assinatura].`,
  },
  {
    id: 'pitch-produto',
    name: 'Pitch de Produto',
    tag: 'Produto',
    category: 'produto',
    description: 'Problema, solução e diferencial de um produto ou MVP, direto ao pedido.',
    blob: 'cyan',
    goal: 'convince',
    slideCount: 8,
    style: 'bold',
    ideaSkeleton: `Pitch do produto [nome] para [público, por exemplo investidores, diretoria ou parceiros].

O problema: [a dor central em uma frase, do ponto de vista de quem sofre com ela]. Quem sofre: [perfil de usuário]. O que essa dor custa hoje: [tempo, dinheiro ou oportunidade perdida].

A solução: [o que o produto faz, em linguagem de benefício e não de tecnologia]. Como funciona na prática: [o fluxo em duas ou três etapas].

Diferencial: as alternativas hoje são [alternativas atuais], e elas falham em [o ponto onde falham]. A gente resolve isso porque [o diferencial real].

Tração ou prova: [números, piloto, usuários, cartas de intenção, o que existir de concreto].

O pedido: precisamos de [investimento, piloto ou parceria] para [o que isso destrava nos próximos meses].`,
  },
  {
    id: 'relatorio-executivo',
    name: 'Relatório Executivo',
    tag: 'Relatórios',
    category: 'relatorios',
    description: 'Resultados de um período pra diretoria: destaques, aprendizados e planos.',
    blob: 'abyss',
    goal: 'inform',
    slideCount: 9,
    style: 'minimal',
    ideaSkeleton: `Relatório executivo de [período, por exemplo segundo trimestre de 2026] da área de [área].

A leitura do período em uma frase: [a conclusão principal, que vai abrir a apresentação].

Principais resultados: [destaque 1 com número, se houver], [destaque 2 com número], [destaque 3 com número].

O que não saiu como planejado: [ponto honesto], e o aprendizado que tiramos: [aprendizado].

O que explica esses números: [contexto por trás do resultado, decisões que tomamos, fatores externos].

Prioridades do próximo período: [frente 1], [frente 2], [frente 3].

O que preciso da diretoria: [decisão, recurso ou apoio específico].`,
  },
  {
    id: 'apresentacao-institucional',
    name: 'Apresentação Institucional',
    tag: 'Institucional',
    category: 'institucional',
    description: 'A CITi completa pra um público externo: quem somos, o que fazemos, provas.',
    blob: 'emerald',
    goal: 'inspire',
    slideCount: 12,
    style: 'balanced',
    ideaSkeleton: `Apresentação institucional da CITi para [público, por exemplo empresa parceira, evento ou universidade].

Quem somos: empresa júnior de tecnologia e inteligência artificial do CIn UFPE, formada por estudantes que entregam projetos reais para o mercado.

O que nos move: [a missão, dita como propósito e não como slogan].

O que fazemos: [frente 1, com o tipo de problema que resolve], [frente 2], [frente 3].

Como trabalhamos: [o método, do primeiro contato à entrega, em etapas].

Provas: [case 1, com o desafio do cliente e o resultado], [case 2, no mesmo formato].

Por que uma empresa júnior: [o argumento honesto, qualidade técnica do CIn com a energia de quem está começando].

Como trabalhar com a gente: [o próximo passo concreto para quem se interessou].`,
  },
  {
    id: 'roadmap-projeto',
    name: 'Roadmap de Projeto',
    tag: 'Produto',
    category: 'produto',
    description: 'Fases, entregas e marcos de um projeto pra alinhar expectativa com o cliente.',
    blob: 'violet',
    goal: 'inform',
    slideCount: 7,
    style: 'balanced',
    ideaSkeleton: `Roadmap do projeto [nome] para [cliente ou time].

Onde estamos hoje: [status atual, o que já foi entregue e o que está em andamento].

O objetivo final: [o que existe no mundo quando esse projeto terminar].

As fases: fase 1, [o que entrega e quando]. Fase 2, [o que entrega e quando]. Fase 3, [o que entrega e quando].

Marcos que o cliente precisa ter no radar: [datas ou entregas que exigem participação dele].

Riscos e dependências: [o que pode atrasar e o que depende de terceiros]. Como mitigamos: [plano].

Próximo passo imediato: [o que acontece já na semana que vem].`,
  },
  {
    id: 'resultados-trimestre',
    name: 'Resultados do Trimestre',
    tag: 'Relatórios',
    category: 'relatorios',
    description: 'O trimestre em números e narrativas, do comercial ao time.',
    blob: 'cyan',
    goal: 'inform',
    slideCount: 10,
    style: 'bold',
    ideaSkeleton: `Resultados do [trimestre e ano] da CITi.

A manchete do trimestre: [a conclusão que resume tudo, em uma frase].

Números principais: [faturamento], [projetos entregues], [novos clientes], [outros indicadores que existirem].

A história por trás dos números: [uma ou duas conquistas que explicam o resultado, com o contexto de como aconteceram].

O que travou: [o obstáculo real do período], e o que fizemos a respeito: [ação].

Time: [mudanças, crescimento, formações, clima].

Foco do próximo trimestre: [prioridade 1], [prioridade 2], [prioridade 3].`,
  },
  {
    id: 'onboarding-membros',
    name: 'Onboarding de Membros',
    tag: 'Pessoas',
    category: 'pessoas',
    description: 'Boas-vindas a novos membros: cultura, estrutura e primeiros passos.',
    blob: 'abyss',
    goal: 'train',
    slideCount: 14,
    style: 'balanced',
    ideaSkeleton: `Onboarding dos novos membros da CITi, turma [turma ou período].

Boas-vindas: [o que significa entrar aqui, dito de forma genuína].

Quem somos: empresa júnior de tecnologia e IA do CIn UFPE, e o que isso quer dizer na prática do dia a dia.

Nossa cultura: [valor 1, com um exemplo de comportamento real que o traduz], [valor 2, com exemplo], [valor 3, com exemplo].

Como a empresa se organiza: [áreas], [papéis], [quem procurar para cada assunto].

O que esperamos nos primeiros meses: [expectativa 1], [expectativa 2], [expectativa 3].

Ferramentas e rituais: [ferramentas do dia a dia], [reuniões e cerimônias fixas].

Como pedir ajuda: [os canais, e o recado de que perguntar é esperado e não é fraqueza].

O primeiro passo desta semana: [a ação concreta que eles fazem ao sair da sala].`,
  },
  {
    id: 'case-sucesso',
    name: 'Case de Sucesso',
    tag: 'Comercial',
    category: 'comercial',
    description: 'Um projeto entregue virando prova social: desafio, solução e resultado.',
    blob: 'violet',
    goal: 'inspire',
    slideCount: 6,
    style: 'minimal',
    ideaSkeleton: `Case do projeto [nome], entregue para [cliente].

O ponto de partida: [a situação do cliente antes da gente, com a dor concreta e o que ela custava].

O desafio: [o que tornava esse problema difícil, técnica ou estrategicamente].

O que a CITi construiu: [a solução e a abordagem, em linguagem que um leigo entende].

O resultado: [o impacto, com números se houver, senão qualitativo e específico].

O que fica: [o aprendizado ou o depoimento do cliente que fecha a história].`,
  },
  {
    id: 'discovery-enterprise',
    name: 'Discovery Enterprise',
    tag: 'Comercial',
    category: 'comercial',
    description: 'Venda o mapeamento do problema antes da solução: método, entregáveis e valor.',
    blob: 'emerald',
    goal: 'convince',
    slideCount: 9,
    style: 'minimal',
    ideaSkeleton: `Proposta de Discovery Enterprise para [cliente].

O contexto: [o que o cliente quer construir ou resolver, nas palavras dele].

O risco de pular essa etapa: partir direto para o desenvolvimento sem mapear o problema costuma custar [risco principal, por exemplo construir a ferramenta errada e descobrir tarde demais]. [Se houver, um exemplo real desse custo].

O que o discovery entrega: imersão no processo atual, entrevistas com [quem será ouvido], mapeamento de dores e oportunidades, e um relatório com recomendações priorizadas.

Como funciona: semana [x], [atividade]. Semana [y], [atividade]. Ao final, [o entregável].

O que muda depois dele: [a decisão que o cliente passa a tomar com segurança, e que hoje ele tomaria no escuro].

Investimento e duração: [valor] em [prazo]. Próximo passo: [o que precisa acontecer para começar].`,
  },
];

/** Os quatro em destaque na Home. */
export const FEATURED_TEMPLATES = TEMPLATES.slice(0, 4);
