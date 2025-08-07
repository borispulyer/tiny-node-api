FROM node:24-alpine

# Git
RUN apk add --no-cache git openssh

USER node

WORKDIR /workspace

COPY --chown=node:node package*.json ./
RUN npm ci || true

# Run container until it gets stopped
CMD ["sleep","infinity"]
