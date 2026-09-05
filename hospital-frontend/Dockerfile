FROM node:22-alpine AS build

WORKDIR /app

# Match the npm version the lockfile was generated with; older npm bundled
# with node:22-alpine resolves optional peer deps differently and rejects
# this lockfile as out of sync.
RUN npm install -g npm@11

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env vars into the JS bundle at build time, so this must be
# passed as a build arg (docker build --build-arg / compose build.args),
# not a runtime container env var.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 81

CMD ["nginx", "-g", "daemon off;"]
