FROM oven/bun:1.3.13-alpine

WORKDIR /app

COPY package.json tsconfig.json ./
RUN bun install --frozen-lockfile || bun install

COPY src ./src
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
