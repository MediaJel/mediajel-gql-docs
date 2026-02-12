# ---- Stage 1: Install dependencies ----
FROM node:18-alpine AS base

WORKDIR /rootDir

COPY package.json .
COPY yarn.lock .
COPY scripts/ scripts/
COPY src/ src/
COPY next.config.js .
COPY postcss.config.js .
COPY tailwind.config.ts .
ARG APP_ENV=prod
COPY entrypoint-dojo.sh .
COPY entrypoint-prod.sh .

RUN chmod +x entrypoint-dojo.sh entrypoint-prod.sh
RUN cp entrypoint-${APP_ENV}.sh entrypoint.sh
RUN yarn install --ignore-engines

# ---- Stage 2: Build the application ----
RUN yarn sync-schema:${APP_ENV}
RUN yarn build

# RUN yarn global add serve
EXPOSE 3000

ENTRYPOINT [ "./entrypoint.sh" ]