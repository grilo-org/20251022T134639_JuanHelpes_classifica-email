# Imagem base Python leve
FROM python:3.11-slim

# Diretório de trabalho dentro do container
WORKDIR /app

# Instalar dependências do sistema necessárias para o PyMuPDF
RUN apt-get update && apt-get install -y \
    gcc \
    libmupdf-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Baixar modelo spaCy de português
RUN python -m spacy download pt_core_news_sm

# Copiar todo o código da API
COPY . .

# Copiar .env **apenas se existir localmente** (não será usado no Render)
# Isso permite rodar local com variáveis do .env
# COPY .env .env
# Se quiser, você pode comentar a linha acima para maior segurança

# Expor porta da API
EXPOSE 8000

# Rodar a API
# Usamos variável $PORT do Render ou 8000 localmente
CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}"]
