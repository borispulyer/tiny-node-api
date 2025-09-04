FROM node:24-alpine

# Apps
RUN apk add --no-cache git openssh bash

USER node

WORKDIR /workspace

COPY --chown=node:node package*.json ./
RUN npm ci || true

# Run container until it gets stopped
CMD ["sleep","infinity"]
