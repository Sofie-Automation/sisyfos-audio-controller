FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable && yarn install --immutable

COPY tsconfig.json jest.config.js ./
COPY src ./src
COPY ui ./ui

RUN yarn build

FROM node:24-alpine

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable && yarn install --immutable --production

COPY --from=builder /app/dist ./dist

EXPOSE 8081 8082

ENV HTTP_PORT=8081
ENV WS_PORT=8082
ENV MOCK_CHANNELS=8

CMD ["node", "dist/index.js"]
