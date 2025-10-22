# requirements (ex.: pip install):
# fastapi uvicorn google-generativeai spacy pymupdf ftfy unidecode python-multipart
# e baixar o modelo spaCy: python -m spacy download pt_core_news_sm

from fastapi import FastAPI, UploadFile, File, Form
from typing import Optional
import fitz  # PyMuPDF
import re, os, json
from dotenv import load_dotenv


import ftfy
from unidecode import unidecode
from collections import Counter
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from google import genai
import spacy

# Carregar variáveis do arquivo .env
load_dotenv()

# The client gets the API key from the environment variable `GEMINI_API_KEY`.
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# --- Carrega spaCy (Português) ---
nlp = spacy.load("pt_core_news_sm")

app = FastAPI()

# Origens que podem acessar sua API
origins = [
    "http://localhost:5173",  # Vite/React/Frontend
    "http://127.0.0.1:5173",
    "https://classifica-email-front.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # lista de origens permitidas
    allow_credentials=True,
    allow_methods=["*"],          # permite todos os métodos (GET, POST, etc.)
    allow_headers=["*"],          # permite todos os headers
)

# Função para remover stopwords e pontuações
def remove_stopwords(text: str) -> str:
    """
    Remove stopwords e pontuações do texto.
    Retorna uma versão "filtrada", mas ainda legível.
    """
    doc = nlp(text)
    tokens = [
        token.text for token in doc
        if not token.is_stop and not token.is_punct and token.text.strip()
    ]
    return " ".join(tokens)

# Função para normalizar espaços em branco
def normalize_whitespace(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()

# Mantém a linguagem "natural", mas remove ruído.
def light_clean(text: str) -> str:
    text = ftfy.fix_text(text)
    text = normalize_whitespace(text)
    return text

# Extrai palavras-chave lematizadas
def get_lemmatized_keywords(text: str, top_n: int = 10):
    doc = nlp(text)
    tokens = [
        token.lemma_.lower() for token in doc
        if not token.is_stop and not token.is_punct and token.lemma_.strip()
    ]
    freq = Counter(tokens)
    most_common = [w for w, _ in freq.most_common(top_n)]
    return most_common

# Helper para extrair texto do arquivo
async def extract_text_from_upload(file: UploadFile) -> str:
    filename = file.filename.lower()
    data = await file.read()

    if filename.endswith(".txt"):
        try:
            return data.decode("utf-8")
        except UnicodeDecodeError:
            return data.decode("latin-1")

    elif filename.endswith(".pdf"):
        if not data:
            raise ValueError("Arquivo PDF está vazio.")
        doc = fitz.open(stream=data, filetype="pdf")
        pages = [page.get_text() for page in doc]
        return "\n".join(pages)

    else:
        raise ValueError("Formato não suportado. Apenas .txt e .pdf")

# Extração de metadados do e-mail
def extract_email_fields(text: str) -> dict:
    result = {
        "from": None,
        "to": None,
        "date": None,
        "subject": None,
        "body": None,
    }

    # Assunto: linha antes de "1 mensagem"
    m = re.search(r"\n(.+)\n1 mensagem", text, flags=re.I)
    if m:
        result["subject"] = m.group(1).strip()

    # Linha depois de "1 mensagem": remetente + data
    m = re.search(
        r"1 mensagem\n(.+?)\s+(\d{1,2} de [a-zç]+ de \d{4} às \d{1,2}:\d{2})",
        text,
        flags=re.I
    )
    if not m:
        m = re.search(
            r"1 mensagem\n(.+?)\s+(\d{1,2}/\d{1,2}/\d{4}, \d{1,2}:\d{2})",
            text
        )
    if m:
        result["from"] = m.group(1).strip()
        result["date"] = m.group(2).strip()

    # Destinatário
    m = re.search(r"Para:\s*([^\n]+)", text)
    if m:
        result["to"] = m.group(1).strip()

    # Corpo: depois do "Para:" até antes da próxima data ou rodapé
    body_match = re.search(
        r"Para:[^\n]+\n(.+?)(?:\n\d{1,2}/\d{1,2}/\d{4}|Gmail -|https?://|\Z)",
        text,
        flags=re.S
    )
    if body_match:
        body = body_match.group(1).strip()
        result["body"] = body

    return result

# Gera prompt para Gemini
def build_prompt(cleaned_text: str, keywords, email_fields: dict = None) -> str:
    # limite o texto enviado se muito grande
    MAX_CHARS = 5000
    main_text = cleaned_text if len(cleaned_text) <= MAX_CHARS else cleaned_text[:MAX_CHARS] + " ... [TRUNCADO]"
    meta = ""
    if email_fields:
        meta = f"""
        Metadados extraídos:
        - De: {email_fields.get("from") or "não identificado"}
        - Assunto: {email_fields.get("subject") or "não identificado"}
        - Data: {email_fields.get("date") or "não identificado"}
        """

    prompt = f"""
Você é um assistente que analisa e-mails para classificá-los (Produtivo / Improdutivo) e sugerir uma resposta apropriada.

{meta}

Palavras-chave (lematizadas e sem stopwords): {keywords}

E-mail (texto limpo):
{main_text}

Tarefas:
1) Classifique o e-mail como:
Produtivo: Emails que requerem uma ação ou resposta específica (ex.: solicitações de suporte técnico, atualização sobre casos em aberto, dúvidas sobre o sistema).
Improdutivo: Emails que não necessitam de uma ação imediata (ex.: mensagens de felicitações, agradecimentos).
2) Gere uma sugestão de resposta educada, concisa (2-6 frases), apropriada ao tom do e-mail.
3) Retorne SOMENTE um JSON bem-formado com as chaves:
   {{
     "classificacao": "Produtivo" | "Improdutivo",
     "para": "endereço extraído ou vazio",
     "assunto": "assunto extraído ou vazio",
     "resposta_sugerida": "texto da resposta sugerida"
   }}

Importante: não explique nada além do JSON. Retorne a resposta_sugerida na formatação de um e-mail, iniciando com uma saudação (ex.: "Olá," ou "Prezado(a),").
"""
    return prompt

# Endpoint principal
@app.post("/process-email")
async def process_email(
    from_: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    body: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    # 1) obter texto bruto
    raw_text = ""
    if body:
        raw_text = (f"Assunto: {subject}\n\n" if subject else "") + (f"\n\nde: {from_}" if from_ else "") + body
    elif file:
        try:
            print("Extraindo texto do arquivo...")
            file_text = await extract_text_from_upload(file)
            email_fields = extract_email_fields(file_text)
            raw_text = (f"Assunto: {email_fields['subject']}\n" if email_fields['subject'] else "") + (f"\n\de: {email_fields['from']}" if email_fields['from'] else "") + (email_fields['body'] if email_fields['body'] else "")
        except ValueError as e:
            return {"error": str(e)}
    else:
        return {"error": "Envie body/subject ou um arquivo .txt/.pdf"}

    # 2) pré-processamento leve (mantendo linguagem natural)
    cleaned = light_clean(raw_text)

    # 2.1) remover stopwords
    filtered_text = remove_stopwords(cleaned)

    # 3) extrações NLP (para enriquecer o prompt)
    keywords = get_lemmatized_keywords(filtered_text, top_n=12)

    # 4) montar prompt e enviar pro Gemini
    prompt = build_prompt(filtered_text, keywords, email_fields if file else {"from": from_, "to": None, "subject": subject, "date": None})

    try:
        response = client.models.generate_content(model="gemini-2.5-flash-lite", contents=prompt)
        text_out = response.text
    except Exception as e:
        return {"error": "Falha ao chamar Gemini", "detail": str(e)}

    # 5) tentar parsear JSON da resposta
    try:
        parsed = json.loads(text_out)
    except Exception:
        # tentativa de extrair primeiro bloco JSON da resposta (fallback)
        m = re.search(r"\{.*\}", text_out, flags=re.S)
        if m:
            try:
                parsed = json.loads(m.group(0))
            except Exception:
                parsed = {"raw_output": text_out}
        else:
            parsed = {"raw_output": text_out}

    # 6) devolver junto com os metadados (entities/keywords/summary)
    return {
        "preprocess": {
            "cleaned_text_preview": cleaned[:1000],
            "keywords": keywords
        },
        "model_output": parsed
    }

@app.get("/")
async def root():
    return {"message": "API de Classificação de E-mails está rodando."}

if __name__ == "__main__":
    uvicorn.run(app, port=8000)