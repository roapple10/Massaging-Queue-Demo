FROM node:20-alpine
WORKDIR /app/frontend
COPY frontend/package.json /app/frontend/package.json
COPY frontend/package-lock.json /app/frontend/package-lock.json
RUN npm i --silent || true
COPY frontend /app/frontend
EXPOSE 5173
CMD ["npm", "run", "dev"]