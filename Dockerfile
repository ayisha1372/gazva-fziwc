# ---- build the React app ----
FROM node:20-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- API + static client in one image ----
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client /app/client/dist /app/client/dist
RUN mkdir -p /data/uploads && chown -R node:node /data /app
ENV UPLOAD_DIR=/data/uploads
USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
