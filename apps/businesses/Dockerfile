# Multi-stage build: compile TypeScript + Vite frontend, then run Express server
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.js ./
COPY routes/ ./routes/
COPY models/ ./models/
COPY services/ ./services/
COPY middleware/ ./middleware/
RUN mkdir -p /app/uploads
EXPOSE 3002
CMD ["node", "server.js"]
