##
# Build Stage:
# Build App with Alpine
##
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY tsup.config.ts ./
COPY src ./src

RUN npm ci
RUN npm run build:prod


##
# Runtime Stage:
##
FROM node:24-alpine

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY package*.json ./
COPY --from=build /app/dist ./dist

RUN npm ci --omit=dev
RUN mkdir -p ./public && chown -R node:node /app

USER node

EXPOSE 3000
VOLUME ["/app/public"]

CMD ["node","dist/server.js"]
