# Immutable image for the 知几 workbench.
#
# Deployed by `ops/deploy/release.sh`, which assembles a build context containing
# this checkout plus the `@singularity-sequence/web-sdk` package the `file:`
# dependency points at. A bare `docker build .` needs the sibling platform repo
# checked out next to this one.
#
# Public platform coordinates are inlined from the committed
# `config/ai-product-manifest.json` (see `src/lib/platform/config.ts`), so the
# build needs no `.env.local` and no secrets. Runtime secrets are supplied to the
# container, not baked into the image.
#
# Building rather than copying a prebuilt `.next` is deliberate: the image is
# reproducible from the commit, and `next build` traces the correct platform
# binaries for the image's OS instead of the builder's.

ARG NODE_VERSION=24.16.0
ARG NPM_REGISTRY=https://registry.npmjs.org

FROM node:${NODE_VERSION}-bookworm AS build
ARG NPM_REGISTRY
WORKDIR /qmdj
# The SDK dependency is `file:../singularity-sequence-consumer-platform/packages/web-sdk`;
# from /qmdj that resolves to the absolute path below.
COPY singularity-sequence-consumer-platform /singularity-sequence-consumer-platform
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --registry "$NPM_REGISTRY"
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# Next's standalone output: the server plus its traced node_modules. The static
# assets are not inside it and must be copied next to it.
COPY --from=build /qmdj/.next/standalone ./
COPY --from=build /qmdj/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
