FROM node:22-alpine

WORKDIR /app

# Match the npm version the lockfile was generated with; older npm bundled
# with node:22-alpine resolves optional peer deps differently and rejects
# this lockfile as out of sync.
RUN npm install -g npm@11

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p logs

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
