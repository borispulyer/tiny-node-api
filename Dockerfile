##
# First Stage:
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
# Final Stage:
# Runtime
##
FROM node:24-alpine

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

RUN mkdir -p ./public && chown -R node:node /app

USER node

EXPOSE 3000
VOLUME ["/app/public"]

CMD ["node","dist/server.js"]
