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
FROM node:24-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=build /app/dist ./dist

RUN npm ci --omit=dev

RUN mkdir -p ./public ./filter ./logs && chown -R node:node ./public ./filter ./logs

# USER node

EXPOSE 3000
VOLUME ["/app/public", "/app/filter", "/app/logs"]

CMD ["node","dist/main.js"]
