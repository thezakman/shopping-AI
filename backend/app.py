import requests
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime
import logging

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://shopping-ai-1.onrender.com"}})

DATA_FILE = 'data.json'
COMMON_ITEMS_FILE = 'common_items.json'
ZONASUL_URL = 'https://www.zonasul.com.br/5357?map=productClusterIds'

# Configuração de Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_data():
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"items": []}
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao decodificar {DATA_FILE}: {e}")
        return {"items": []}

def save_data(data):
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Erro ao salvar dados: {e}")

# Função para fazer scraping no Zona Sul e pegar os itens em destaque
def get_featured_items():
    try:
        # Fazer a requisição ao site
        response = requests.get(ZONASUL_URL)
        response.raise_for_status()  # Verifica erros

        # Usar BeautifulSoup para parsear o HTML
        soup = BeautifulSoup(response.text, 'html.parser')

        # Encontrar os artigos de produtos em destaque
        featured_items = []
        for article in soup.find_all('article', {'class': 'vtex-product-summary-2-x-element'}):
            # Encontra o nome do produto dentro do artigo
            name_tag = article.find('span', {'class': 'vtex-product-summary-2-x-productBrand'})
            if name_tag:
                name = name_tag.text.strip()
                featured_items.append(name)

        return featured_items
    except Exception as e:
        logger.error(f"Erro ao realizar scraping: {e}")
        return []

# Função para gerar combinações frequentes com base no histórico
def generate_frequent_combinations(data):
    combinations = {
        "leite": ["café", "açúcar", "achocolatado", "biscoitos"],
        "pão": ["manteiga", "geleia", "queijo", "presunto"],
        "arroz": ["feijão", "farinha", "óleo"],
        "macarrão": ["molho de tomate", "queijo parmesão", "azeitona"],
        "frango": ["batata", "cenoura", "temperos", "alho"],
    }
    frequent_combinations = []

    item_occurrences = {}
    for item in data['items']:
        item_name = item['name'].lower()
        if item_name in item_occurrences:
            item_occurrences[item_name] += 1
        else:
            item_occurrences[item_name] = 1

    for item, count in item_occurrences.items():
        if item in combinations:
            frequent_combinations.extend(combinations[item])

        for other_item, other_count in item_occurrences.items():
            if item != other_item and (count > 2 or other_count > 2):
                frequent_combinations.append(other_item)

    return list(set(frequent_combinations))[:10]

# Endpoint para retornar sugestões dinâmicas com base no histórico e nos itens destacados
@app.route('/suggestions_dynamic', methods=['GET'])
def suggestions_dynamic():
    try:
        # Carregar dados do histórico do usuário
        data = load_data()

        # Itens mais frequentes do histórico
        sorted_items = sorted(data['items'], key=lambda x: x.get('count', 0), reverse=True)
        suggestions = sorted_items[:5]

        # Gerar combinações frequentes
        frequent_combinations = generate_frequent_combinations(data)

        # Pegar itens destacados do site Zona Sul
        featured_items = get_featured_items()

        # Combinar sugestões do histórico e combinações frequentes com os itens destacados
        final_suggestions = []
        final_suggestions.extend([item['name'] for item in suggestions])
        final_suggestions.extend(frequent_combinations)
        final_suggestions.extend(featured_items)

        # Remover duplicatas e limitar a 10 sugestões no total
        return jsonify(list(set(final_suggestions))[:10]), 200
    except Exception as e:
        logger.error(f"Erro ao gerar sugestões dinâmicas: {e}")
        return jsonify({"message": "Erro interno no servidor."}), 500

if __name__ == '__main__':
    app.run(debug=True)
