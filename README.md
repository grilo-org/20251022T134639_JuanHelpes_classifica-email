# 📧 Analizador de Email com IA

Este projeto consiste em uma aplicação composta por **duas partes**:

- **API (FastAPI)** localizada em `/api`  
  Responsável por receber o texto ou arquivo de um e-mail, extrair informações, analisar com IA (Google Gemini) e retornar:

  - Classificação do e-mail (Produtivo / Improdutivo)
  - Sugestão de resposta adequada

- **Frontend (Vite + React)** localizado em `/client`  
  Interface para o usuário escrever ou fazer upload de um e-mail e visualizar a resposta sugerida pela IA.

---

## 📂 Estrutura de Arquivos

O projeto está organizado em duas pastas principais:

- **/api** → contém o backend (FastAPI, lógica de análise e IA).
- **/client** → contém o frontend (Vite + React).

---

## ⚙️ Funcionalidades

1. Upload de e-mails em `.txt` ou `.pdf`, ou digitar o conteúdo diretamente.
2. Extração automática de campos como remetente, destinatário, assunto e corpo.
3. Pré-processamento de texto (limpeza, stopwords, lematização).
4. Envio ao modelo Gemini para:
   - Classificar (Produtivo / Improdutivo)
   - Gerar uma resposta educada e concisa
5. Retorno em formato JSON com a resposta sugerida.

---

## 🚀 Como rodar localmente (sem Docker)

### 1. Clone o repositório

```bash
git clone https://github.com/JuanHelpes/classifica-email.git
cd classifica-email
```

### 2. Configure a API

```bash
cd api
pip install -r requirements.txt
python -m spacy download pt_core_news_sm
```

### 3. Configure as variáveis de ambiente

```bash
Crie um arquivo .env dentro de /api com o conteúdo:
GEMINI_API_KEY=sua_chave_aqui
```

### 4. Rode a API

```bash
uvicorn api:app --reload --port 8000
A API ficará disponível em http://localhost:8000
```

### 5. Rode o frontend

```bash
cd ../client
npm install
npm run dev

O frontend ficará disponível em http://localhost:5173.
```

## 🐳 Como rodar com Docker

### 1. Build da imagem

```bash
Dentro da pasta /api:

docker build -t classifica-api .
```

### 2. Rodar o container

```bash
docker run --env-file .env -p 8000:8000 classifica-api
```

## 🔑 Variáveis de Ambiente

- **GEMINI_API_KEY**: chave da API do Google Gemini (obrigatória).
