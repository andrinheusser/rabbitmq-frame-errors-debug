FROM denoland/deno:1.26.0

ARG DENO_AUTH_TOKENS
ENV DENO_AUTH_TOKENS=$DENO_AUTH_TOKENS

RUN apt-get update && apt-get install -y curl ping

# Set working directory
WORKDIR /app

ADD . .
COPY deps.ts .
RUN deno cache --reload deps.ts



RUN deno cache app/main.ts

# Application port (optional)
EXPOSE 8886

# Debugging port (optional)
EXPOSE 9229

ENTRYPOINT ["deno", "run", "--allow-read", "--allow-net", "--allow-env", "app/main.ts"]

