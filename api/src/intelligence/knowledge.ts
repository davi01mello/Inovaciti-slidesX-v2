/**
 * BASE DE CONHECIMENTO DO CITi — a fonte de verdade sobre a casa.
 *
 * Entra no prompt base de TODOS os agentes (ver writing.ts): quando a apresentação
 * fala do CITi, os fatos vêm daqui, nunca da imaginação do modelo. Se uma
 * informação não está nesta base, o agente não a afirma.
 *
 * ATENÇÃO ao dado DATADO: "30 anos" era a marca comemorativa de 2025 (1995→2025)
 * e o NPS 88 é de 2025. Anos de mercado se CALCULAM a partir de 1995 com o ano
 * atual — que é injetado por request nos build*Prompt (currentYearLine), porque
 * este texto é estático e cacheável.
 */

export const CITI_KNOWLEDGE = `
BASE DE CONHECIMENTO DO CITi (fonte de verdade; não invente nada além disto):

IDENTIDADE
- CITi (grafia oficial: C-I-T-i, com "i" minúsculo no fim), por extenso Centro Integrado de Tecnologia da Informação.
- Empresa júnior de tecnologia e IA do CIn-UFPE (Centro de Informática da UFPE). Associação civil sem fins lucrativos.
- Fundado em 1995: terceira empresa júnior de Pernambuco e a primeira de TI do estado.
- Posicionamento: 1ª e maior empresa júnior de tecnologia do Brasil.
- Sede no CIn-UFPE, um dos maiores centros de computação e IA da América Latina ("Centro de Excelência e Referência" pela CAPES, cursos 5 estrelas no Guia do Estudante).
- Quem faz parte é "CITiane". Proposta de valor: ajudar empresas a diagnosticar problemas de negócio e implementar soluções tecnológicas com segurança, previsibilidade e retorno mensurável.
- "Empresa júnior" é parte da identidade e um diferencial de custo, não uma fraqueza a esconder.

ANOS DE MERCADO (como calcular; leia antes de usar)
- Fato-âncora: fundado em 1995. Anos de mercado = ano atual − 1995 (o ano atual vem no prompt).
- A marca "30 ANOS" foi a comemoração de 2025; NÃO escreva "30 anos" fora de 2025. Preferir "fundada em 1995" ou "mais de 30 anos de mercado", que envelhecem bem.

NÚMEROS-CHAVE (use como estão, sem arredondar nem inventar)
- Fundação: 1995 · Ranking: 1ª e maior EJ de tecnologia do Brasil · Membros: 60 multidisciplinares · NPS: 88 (referente a 2025; dado datado).

PROPÓSITO, MISSÃO E VALORES (redação oficial; num slide, mantenha fiel, não parafraseie)
- Propósito: transformar pessoas através de soluções em tecnologia, com impacto nos clientes pelos projetos e nos membros pela cultura.
- Missão: "Ser referência nacional em inovação e excelência, revolucionando ecossistemas e empoderando pessoas."
- Valores: "Eu sou o CITi e o CITi sou eu" (dono de um legado, responsabilidade com a missão); "Jogo Limpo" (ética, transparência, feedbacks construtivos); "Espírito de Time" (colaboração acima da vontade individual); "Todos pelo Cliente" (a melhor experiência do cliente); "Vai lá, Marca e Comemora" (proatividade, sentimento de dono, alta performance); "DNA Experimentador" (inconformismo, inovação e experimentação); "Querência" (vontade genuína de fazer acontecer, persistência pela excelência).

METODOLOGIA (princípio: diagnostica primeiro, depois escolhe o melhor caminho)
- Fase 1, Discovery: mapeia o problema, quantifica a ineficiência e desenha a solução com protótipo e business case.
- Fase 2, Desenvolvimento: design centrado no usuário + desenvolvimento ágil; do protótipo aprovado ao produto funcional ("Produto e Design" evolui o protótipo pra alta fidelidade com testes de usabilidade; "Desenvolvimento" transforma em aplicações web/mobile com metodologias ágeis).
- Fase 2 paralela, Dados + IA: "de dados desorganizados a decisões inteligentes" — diagnóstico de dados e integrações, Data Warehouse e dashboards, análises preditivas e insights, IA aplicada ao negócio (consultas inteligentes, automação de decisões).

CARTA DE SERVIÇOS (4 modalidades)
1. Concepção de solução: pesquisas quali/quanti pra validar o produto; co-construção de fluxo e interface com o cliente.
2. Desenvolvimento de softwares: automação de processos e novos negócios digitais a partir de ideia consolidada.
3. Acompanhamento de soluções: métricas e dados pro sucesso do produto depois que está no mercado.
4. Consultoria de dados: Ciência de Dados e BI — análises descritivas a prescritivas, ETL, dashboards personalizados, insights.

ESTRUTURA INTERNA (4 grandes áreas)
- Institucional (estratégia, posicionamento, stakeholders, MEJ) · Gente e Gestão (cultura, jornada do membro, diversidade, financeiro) · Soluções (área-fim: design de produto, desenvolvimento, dados) · Negócios (marketing e comercial, da pré à pós-venda).

DIFERENCIAIS (por que o CITi)
- Ecossistema CIn-UFPE: acesso direto a um dos maiores centros de pesquisa em IA e computação da América Latina.
- Décadas de mercado real entregando pra empresas como Riachuelo, Neoenergia e Hospital das Clínicas.
- IA aplicada como ferramenta concreta de resultado, não buzzword.
- Custo-benefício: qualidade de consultoria sênior com investimento acessível (modelo júnior reduz custo sem comprometer entrega).

CLIENTES: Neoenergia, Riachuelo (RCHLO), Visagio, Hospital das Clínicas (HC-FMUSP), Moura, Deca.
PARCEIROS: CIn-UFPE, Neurotech (marca B3), Visagio, Accenture, iFood, Porto Digital, Incognia.
ALUMNI EM: Microsoft, Stone, Visagio, Neurotech, Incognia, Grupo Boticário, Accenture, Nubank, Google, Porto Digital, Banco do Brasil, Meta, Samsung, Ambev, Deloitte, Avanade, iFood, Bradesco, Red Bull, CESAR.

CASES DOCUMENTADOS (pra credibilidade, prefira estes três)
- Riachuelo: ecossistema omnichannel de alta performance (Discovery + design); eliminou barreiras entre físico e digital, com aumento direto nas taxas de conversão no mobile.
- Neoenergia: monitoramento inteligente e manutenção preditiva de ativos críticos (transmissão e sistemas hidráulicos); machine learning antecipando falhas com alta precisão, minimizando perdas e garantindo eficiência da rede.
- CAS Tecnologia (líder em IoT no Brasil): aplicação web pra monitorar dispositivos de medição de energia, água e gás em nuvem, com visualização em tempo real e dashboards.

PRÊMIOS (histórico resumido): melhores cases em encontros estaduais e nacionais do MEJ desde 2011 (NEGO, ESEJ, EPEEJ, ALMEJ, ENEJ 2013 com o "CITi Social", GPJ 2018); prêmio AMBEV 2012 "Grandes Sonhos"; Inovação Banco do Nordeste 2017; 1º lugar internacional no JEWC 2021 com equipe 100% CITi; 1º lugar nacional em Soluções Tech 2022 (Brasil Júnior + Fundação Estudar).

CONTEXTO MEJ: primeira EJ do mundo na ESSEC (Paris, 1967); primeira do Brasil na FGV (1988); confederação Brasil Júnior (2003), federação de PE é a FEJEPE; o Brasil tem o maior número de EJs do mundo (800+ federadas). Lema da Brasil Júnior: "Ser júnior no Brasil é ser gigante pela própria natureza."

REGRAS DE USO DESTA BASE
- Números e nomes: só os desta base, exatamente como estão. NPS e "anos" são datados; calcule anos a partir de 1995 com o ANO ATUAL do prompt.
- Se o briefing do usuário trouxer números/clientes próprios, os do briefing valem pro conteúdo dele; esta base cobre o que é do CITi.
- Se uma informação sobre o CITi não estiver aqui, não a afirme.
`.trim();

/** Linha dinâmica por request: o ano atual pro cálculo de "anos de mercado". */
export function currentYearLine(): string {
  const year = new Date().getFullYear();
  return `ANO ATUAL: ${year}. Anos de mercado do CITi = ${year} − 1995 = ${year - 1995}.`;
}
