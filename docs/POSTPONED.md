# Decisões de escopo adiadas conscientemente

Cada item aqui foi considerado e ficou de fora desta entrega por decisão de escopo, não por esquecimento.

| Item | Por que ficou pra depois |
| --- | --- |
| Compartilhamento real por link | Exige backend de persistência compartilhada (hoje tudo vive no localStorage de cada navegador). O botão fake foi removido. |
| Anexos interpretados pela IA no chat | Exige upload real e um modelo multimodal lendo o conteúdo. O botão de anexar do chat foi removido; os anexos do wizard (StepAssets) continuam como metadados de contexto. |
| Rate limit com Redis | O armazenamento em memória por instância cobre o cenário atual (uma instância). Redis só quando houver escala horizontal. |
| Tabela image_cache em banco | A convenção de nome de arquivo com hash já resolve o cache. Banco só se surgir necessidade de invalidação seletiva. |
| Cron de limpeza de imagens antigas | Existe o script manual `api/scripts/cleanup.ts` documentado no README. Promover pra cron real quando o volume justificar. |
| Code splitting do bundle do app | O bundle único de ~730kb gera aviso no build mas não trava o MVP em rede local. |
| Logo vetorial oficial | O overlay usa o wordmark extraído da referência de capa (`api/assets/logo-citi-white.png`). Substituir pelo PNG/SVG oficial exportado do design quando disponível: basta trocar o arquivo, o código não muda. |
| Biblioteca, Anexos, Lixeira e Atividade no sidebar | Eram rotas stub sem função. Saíram da navegação até existirem de verdade. Templates e Marca CITi ficaram como "em construção" porque são os próximos passos reais. |
| Importar arquivo e Colar conteúdo (atalhos da home) | Prometiam importação que não existe. Removidos dos atalhos até a feature existir. |
| Notificações reais | O sino abre um estado vazio honesto. Feed de notificações só faz sentido quando houver colaboração ou processamento assíncrono de longa duração. |
| Botão Compartilhar do workspace | Mostrava "link copiado" sem copiar nada. Removido. Compartilhamento real exige persistência fora do localStorage. |
| Anexar arquivos no chat do workspace | Os arquivos nunca chegavam na IA (só metadados). Removido do chat. Os anexos do wizard (StepAssets) continuam, porque entram como contexto no prompt. |
| Regenerar imagem de um slide específico na UI | O endpoint unitário `POST /api/slides/render-image` já existe e usa o mesmo pipeline com cache. Falta só o botão no workspace. |
