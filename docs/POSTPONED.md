# Decisões de escopo adiadas conscientemente

Cada item aqui foi considerado e ficou de fora por decisão de escopo, não por
esquecimento. (O sistema de geração de imagem de fundo por IA foi substituído pela
composição sobre templates medidos, então as pendências daquela era saíram desta
lista. Ver `brand/README.md` pro sistema atual.)

| Item | Por que ficou pra depois |
| --- | --- |
| Compartilhamento real por link | Exige backend de persistência compartilhada (hoje tudo vive no localStorage de cada navegador). |
| Anexos interpretados pela IA no chat | Exige um modelo multimodal lendo o conteúdo. Os anexos do wizard (StepAssets) já entram: foto vira slide, logo vira marca na capa. |
| Rate limit com Redis | O armazenamento em memória por instância cobre o cenário atual (uma instância). Redis só com escala horizontal. |
| Code splitting do bundle do app | O bundle único gera aviso no build mas não trava o uso em rede local. |
| Notificações reais | O sino abre um estado vazio honesto. Feed só faz sentido com colaboração ou processamento assíncrono longo. |
| Biblioteca, Lixeira e Atividade no sidebar | Rotas que ainda amadurecem. Ficam visíveis conforme ganham função de verdade. |
