FROM rust:bookworm as builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y protobuf-compiler && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY . .

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y curl openssl libssl-dev ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/active-matches-scraper /usr/local/bin/active-matches-scraper

EXPOSE 8080

CMD ["active-matches-scraper"]
