# Use official Node.js LTS image
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --dangerously-allow-all-builds

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]