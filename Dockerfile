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
COPY entrypoint.sh .

RUN chmod +x entrypoint.sh
RUN yarn install --ignore-engines

# ---- Stage 2: Build the application ----
RUN yarn sync-schema
RUN yarn build

# RUN yarn global add serve
EXPOSE 3000

ENTRYPOINT [ "./entrypoint.sh" ]