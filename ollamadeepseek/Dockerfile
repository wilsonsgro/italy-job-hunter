FROM ollama/ollama:latest

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl bash ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY ./ollamadeepseek/Modelfile /tmp/Modelfile

RUN /bin/ollama serve & \
    OLLAMA_PID=$! && \
    for _ in $(seq 1 60); do \
      curl -fsS "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1 && break; \
      sleep 2; \
    done && \
    ollama pull qwen2.5:3b-instruct && \
    ollama create ollama-deepseek -f /tmp/Modelfile && \
    kill "$OLLAMA_PID"

COPY ./src/ollama/init-ollama.sh /usr/local/bin/init-ollama.sh
RUN chmod +x /usr/local/bin/init-ollama.sh

EXPOSE 11434

ENTRYPOINT ["/usr/local/bin/init-ollama.sh"]
