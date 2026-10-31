FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY src ./src
ENV NODE_ENV=production
RUN mkdir -p /var/lib/shehnat && chown -R node:node /var/lib/shehnat
USER node
EXPOSE 8080
CMD ["node", "--no-warnings", "src/server.js"]
