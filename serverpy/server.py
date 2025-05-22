from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
import os
import json
import re
import google.generativeai as genai
import requests  # Adicione esta linha
from dotenv import load_dotenv

load_dotenv()


app = Flask(__name__)
CORS(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print("GEMINI_API_KEY:", GEMINI_API_KEY)
# Config
SCOPES = ["https://www.googleapis.com/auth/userinfo.profile"]

CLIENT_SECRET_FILE = "auth.json"
TOKEN_FILE = 'token.json'

def authenticate():
    creds = None
    try:
        if os.path.exists('token.json'):
            creds = Credentials.from_authorized_user_file('token.json', SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
                creds = flow.run_local_server(port=8080)
            with open('token.json', 'w') as token:
                token.write(creds.to_json())
    except Exception as e:
        return f"Erro durante autenticação: {str(e)}"
    return creds

@app.route('/')
def index():
    creds = authenticate()
    if isinstance(creds, str):  # Se for erro
        return creds
    return "Autenticação realizada com sucesso!"

@app.route('/auth')
def auth():
    creds = authenticate()
    if isinstance(creds, str):
        return creds
    return redirect('http://localhost:5500')



@app.route('/gemini', methods=['POST'])
def gemini():
    try:
        data = request.get_json()
    
        # Extraímos o texto da transcrição e as ações possíveis
        transcription = data.get('text', '')
        acoes_possiveis = data.get('acoes', [])
       

        
            # Corpo da requisição (dados JSON que você quer enviar)
        data = {
            "contents": [
            {
                "parts": [
                    {"text": "Você é um assistente que ajuda uma pessoa com deficiência visual a navegar em um site."},
                    {"text": "A pessoa disse: " + transcription},
                    {"text": "As ações possíveis são: " + ", ".join(acoes_possiveis)},
                    {"text": "Preciso que você me fale o contexto da ação (exemplo: clique no botão comprar tem ação clique_botao e contexto comprar)"},
                     {"text": "Responda apenas com um JSON no seguinte formato: { \"acao\": \"nome_da_acao\", \"contexto\": \"palavras-chaves_do_contexto\" }"},
                    {"text": "Não adicione nenhuma explicação, apenas o JSON."}
                ]
            }
            ],
        }

        # Cabeçalhos da requisição
        headers = {
            'Content-Type': 'application/json'
        }

        gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY
        
        # Envia para o Gemini
        response = requests.post(gemini_url, headers=headers, data=json.dumps(data))

        # Verifica se a requisição foi bem-sucedida
        if response.status_code == 200:
            # Converte a resposta para JSON
            response_data = response.json()
            
            # Imprimir a resposta completa para depuração
            #print("Resposta completa do Gemini:", response_data)

            # Acessando o texto desejado
            text = response_data['candidates'][0]['content']['parts'][0]['text']
            #print("Texto extraído:", text)
           
            # Extrai o conteúdo entre ```json e ```
            match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)

            if match:
                json_string = match.group(1)
                resultado = json.loads(json_string)
                print("JSON extraído:", resultado)
            else:
                resultado = ""
                print("Não foi possível extrair o JSON do texto.")

            return resultado, 200
        else:
            return jsonify({"error": "Failed to send response to Gemini", "details": response.text}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5500)
