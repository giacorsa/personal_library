FROM node:24-bookworm-slim AS frontend-build
WORKDIR /app/frontend

RUN npm install --global pnpm@11.20.0
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

COPY frontend/ ./
RUN pnpm build

FROM node:24-bookworm-slim AS app
WORKDIR /app/backend

RUN npm install --global pnpm@11.20.0
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY backend/src/ ./src/
COPY --from=frontend-build /app/frontend/dist/ /app/frontend/dist/

CMD ["node", "src/server.js"]