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

# Função para carregar os dados do arquivo JSON
def load_data():
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"items": []}
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao decodificar {DATA_FILE}: {e}")
        return {"items": []}

# Função para salvar os dados no arquivo JSON
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

# Função para carregar itens comuns do arquivo JSON
def load_common_items():
    try:
        with open(COMMON_ITEMS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning(f"{COMMON_ITEMS_FILE} não encontrado. Retornando lista vazia.")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao decodificar {COMMON_ITEMS_FILE}: {e}")
        return []

# Função para gerar combinações frequentes com base no histórico
def generate_frequent_combinations(data):
    # Combinações estáticas definidas manualmente
    combinations = {
        "leite": ["café", "açúcar", "achocolatado", "biscoitos"],
        "pão": ["manteiga", "geleia", "queijo", "presunto"],
        "arroz": ["feijão", "farinha", "óleo"],
        "macarrão": ["molho de tomate", "queijo parmesão", "azeitona"],
        "frango": ["batata", "cenoura", "temperos", "alho"],
    }
    
    frequent_combinations = []
    item_occurrences = {}

    # Contagem de ocorrências dos itens
    for item in data['items']:
        item_name = item['name'].lower()
        item_occurrences[item_name] = item_occurrences.get(item_name, 0) + 1

    # Gerar sugestões com base nas combinações estáticas e itens que aparecem mais de 2 vezes
    for item, count in item_occurrences.items():
        if item in combinations:
            frequent_combinations.extend(combinations[item])

        # Sugestões dinâmicas baseadas na frequência de co-ocorrência
        for other_item, other_count in item_occurrences.items():
            if item != other_item and (count > 2 or other_count > 2):
                frequent_combinations.append(other_item)

    # Remover duplicatas e limitar a 10 sugestões
    return list(set(frequent_combinations))[:10]


# Função para retornar sugestões dinâmicas com base no histórico e nos itens destacados
@app.route('/dynamic_suggestions', methods=['GET'])
def dynamic_suggestions():
    try:
        logger.info("Carregando dados do histórico do usuário...")
        # Carregar dados do histórico do usuário
        data = load_data()
        logger.info(f"Dados carregados: {data}")

        # Itens mais frequentes do histórico
        logger.info("Gerando sugestões com base no histórico...")
        sorted_items = sorted(data['items'], key=lambda x: x.get('count', 0), reverse=True)
        suggestions = sorted_items[:5]
        logger.info(f"Sugestões baseadas no histórico: {suggestions}")

        # Gerar combinações frequentes
        logger.info("Gerando combinações frequentes...")
        frequent_combinations = generate_frequent_combinations(data)
        logger.info(f"Combinações frequentes: {frequent_combinations}")

        # Pegar itens destacados do site Zona Sul
        logger.info("Obtendo itens destacados do Zona Sul...")
        featured_items = get_featured_items()
        logger.info(f"Itens destacados: {featured_items}")

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


# Função para obter ou adicionar itens
@app.route('/items', methods=['GET', 'POST'])
def get_or_add_items():
    data = load_data()

    if request.method == 'GET':
        return jsonify(data['items'])

    if request.method == 'POST':
        item = request.json.get('item', '').strip()
        observation = request.json.get('observation', '').strip()
        if not item:
            return jsonify({"message": "Nome do item é obrigatório."}), 400

        # Verificar se o item já existe (case insensitive)
        for existing_item in data['items']:
            if existing_item['name'].lower() == item.lower():
                return jsonify({"message": "Item já existe na lista."}), 400

        new_item = {
            'id': len(data['items']) + 1,
            'name': item,
            'observation': observation,
            'date_added': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'purchased': False
        }
        data['items'].append(new_item)
        save_data(data)
        logger.info(f"Item adicionado: {item}")
        return jsonify(new_item), 201

# Função para atualizar ou deletar um item
@app.route('/items/<int:item_id>', methods=['PUT', 'DELETE'])
def update_or_delete_item(item_id):
    data = load_data()
    item = next((item for item in data['items'] if item['id'] == item_id), None)

    if not item:
        return jsonify({"message": "Item não encontrado."}), 404

    if request.method == 'PUT':
        new_name = request.json.get('name', '').strip()
        observation = request.json.get('observation', '').strip()
        if not new_name:
            return jsonify({"message": "Nome do item é obrigatório."}), 400

        # Verificar se o novo nome já existe (case insensitive)
        for existing_item in data['items']:
            if existing_item['name'].lower() == new_name.lower() and existing_item['id'] != item_id:
                return jsonify({"message": "Outro item com esse nome já existe."}), 400

        item['name'] = new_name
        item['observation'] = observation
        save_data(data)
        logger.info(f"Item atualizado: ID {item_id} para '{new_name}' com observação '{observation}'")
        return jsonify(item), 200

    if request.method == 'DELETE':
        data['items'] = [itm for itm in data['items'] if itm['id'] != item_id]
        save_data(data)
        logger.info(f"Item removido: ID {item_id}")
        return jsonify({"message": "Item removido com sucesso."}), 200

# Função para marcar item como comprado ou não comprado
@app.route('/toggle_purchased/<int:item_id>', methods=['PATCH'])
def toggle_purchased(item_id):
    data = load_data()
    item = next((item for item in data['items'] if item['id'] == item_id), None)

    if not item:
        return jsonify({"message": "Item não encontrado."}), 404

    item['purchased'] = not item['purchased']
    save_data(data)
    status = "comprado" if item['purchased'] else "não comprado"
    logger.info(f"Item ID {item_id} marcado como {status}.")
    return jsonify(item), 200

# Função para sugestões com base em itens comuns e itens adicionados pelo usuário
@app.route('/suggestions', methods=['GET'])
def suggestions():
    try:
        logger.info("Carregando dados e itens comuns...")
        data = load_data()
        common_items = load_common_items()
        item_names = [item['name'] for item in data['items']]

        # Combine itens comuns com os adicionados pelo usuário
        combined_items = list(set(common_items + item_names))

        query = request.args.get('q', '').strip().lower()
        if not query:
            logger.warning("Nenhuma query fornecida para sugestões.")
            return jsonify([])

        # Filtrar sugestões que começam com a query
        filtered_suggestions = [item for item in combined_items if item.lower().startswith(query)]
        logger.info(f"Sugestões filtradas para query '{query}': {filtered_suggestions}")

        return jsonify(filtered_suggestions[:10])
    except Exception as e:
        logger.error(f"Erro no endpoint /suggestions: {e}")
        return jsonify({"message": "Erro interno no servidor."}), 500


if __name__ == '__main__':
    app.run(debug=True)
