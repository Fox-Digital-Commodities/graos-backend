FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN npm ci --only=production

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo

RUN mkdir -p uploads media-cache

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

COPY --from=builder /app/src/common/data ./src/common/data

EXPOSE 3001

CMD ["node", "dist/main"]