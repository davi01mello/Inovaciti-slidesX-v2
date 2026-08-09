FROM node:22-alpine

WORKDIR /repo

# Copia o repo inteiro (pastas pesadas/irrelevantes ficam fora via .dockerignore).
COPY . .

RUN cd api && npm ci && npm run build
RUN cd app && npm ci && npm run build

ENV NODE_ENV=production
EXPOSE 8787

CMD ["node", "api/dist/index.js"]
