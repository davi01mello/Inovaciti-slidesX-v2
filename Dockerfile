FROM node:22-alpine

WORKDIR /repo

# Copia o repo inteiro (pastas pesadas/irrelevantes ficam fora via .dockerignore).
COPY . .

# npm install em vez de npm ci: o lockfile tem entradas condicionais por
# plataforma (binários nativos do Vite/Rolldown) que já causaram esse exato
# "Missing X from lock file" mesmo com o lockfile "correto" -- install resolve
# pra plataforma do container em vez de exigir sincronia perfeita e prévia.
RUN cd api && npm install && npm run build
RUN cd app && npm install && npm run build

ENV NODE_ENV=production
EXPOSE 8787

CMD ["node", "api/dist/index.js"]
