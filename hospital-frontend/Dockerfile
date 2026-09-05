FROM node:20-alpine

WORKDIR /app

# Match the npm version the lockfile was generated with; older npm bundled
# with node:20/22-alpine resolves optional peer deps differently and rejects
# this lockfile as out of sync.
RUN npm install -g npm@11

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

EXPOSE 5174

# --host is required for the dev server to be reachable from outside the
# container (Vite binds 127.0.0.1 by default). --port pins it to match the
# port mapped in docker-compose.yml.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]
