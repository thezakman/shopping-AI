from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime
import logging

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://shopping-ai-1.onrender.com"}})  # Corrigido para o frontend correto

DATA_FILE = 'data.json'
COMMON_ITEMS_FILE = 'common_items.json'

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

@app.route('/')
def index():
    return jsonify({"message": "API da Lista de Compras Inteligente"})

@app.route('/items', methods=['GET', 'POST'])
def get_or_add_items():
    data = load_data()

    if request.method == 'GET':
        return jsonify(data['items'])

    if request.method == 'POST':
        item = request.json.get('item', '').strip()
        observation = request.json.get('observation', '').strip()  # Nova funcionalidade: observação
        if not item:
            return jsonify({"message": "Nome do item é obrigatório."}), 400

        # Verificar se o item já existe (case insensitive)
        for existing_item in data['items']:
            if existing_item['name'].lower() == item.lower():
                return jsonify({"message": "Item já existe na lista."}), 400

        new_item = {
            'id': len(data['items']) + 1,
            'name': item,
            'observation': observation,  # Adicionada observação
            'date_added': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'purchased': False
        }
        data['items'].append(new_item)
        save_data(data)
        logger.info(f"Item adicionado: {item}")
        return jsonify(new_item), 201

@app.route('/items/<int:item_id>', methods=['PUT', 'DELETE'])
def update_or_delete_item(item_id):
    data = load_data()
    item = next((item for item in data['items'] if item['id'] == item_id), None)

    if not item:
        return jsonify({"message": "Item não encontrado."}), 404

    if request.method == 'PUT':
        new_name = request.json.get('name', '').strip()
        observation = request.json.get('observation', '').strip()  # Permitir atualização da observação
        if not new_name:
            return jsonify({"message": "Nome do item é obrigatório."}), 400

        # Verificar se o novo nome já existe (case insensitive)
        for existing_item in data['items']:
            if existing_item['name'].lower() == new_name.lower() and existing_item['id'] != item_id:
                return jsonify({"message": "Outro item com esse nome já existe."}), 400

        item['name'] = new_name
        item['observation'] = observation  # Atualizar observação
        save_data(data)
        logger.info(f"Item atualizado: ID {item_id} para '{new_name}' com observação '{observation}'")
        return jsonify(item), 200

    if request.method == 'DELETE':
        data['items'] = [itm for itm in data['items'] if itm['id'] != item_id]
        save_data(data)
        logger.info(f"Item removido: ID {item_id}")
        return jsonify({"message": "Item removido com sucesso."}), 200

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

@app.route('/suggestions', methods=['GET'])
def suggestions():
    try:
        data = load_data()
        common_items = load_common_items()
        item_names = [item['name'] for item in data['items']]
        
        # Combine itens comuns com os adicionados pelo usuário
        combined_items = list(set(common_items + item_names))
        
        query = request.args.get('q', '').strip().lower()
        if not query:
            return jsonify([])

        # Filtrar sugestões que começam com a query
        filtered_suggestions = [item for item in combined_items if item.lower().startswith(query)]
        # Limitar a 10 sugestões
        return jsonify(filtered_suggestions[:10])
    except Exception as e:
        logger.error(f"Erro no endpoint /suggestions: {e}")
        return jsonify({"message": "Erro interno no servidor."}), 500

@app.route('/add_item', methods=['POST'])
def add_item():
    data = request.get_json()
    item = data.get('item', '').strip().lower()
    observation = data.get('observation', '').strip()

    if not item:
        return jsonify({"message": "Nome do item é obrigatório."}), 400

    # Verificar se o item já existe
    for existing_item in data['items']:
        if existing_item['name'].lower() == item:
            existing_item['count'] += 1  # Incrementar contador
            return jsonify(existing_item), 200

    new_item = {
        'id': len(data['items']) + 1,
        'name': item,
        'observation': observation,
        'date_added': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'count': 1,  # Contador inicializado em 1
        'purchased': False
    }
    data['items'].append(new_item)
    save_data(data)
    return jsonify(new_item), 201


@app.route('/suggestions_based_on_history', methods=['GET'])
def suggestions_based_on_history():
    try:
        data = load_data()
        # Sort items by count (descending order)
        sorted_items = sorted(data['items'], key=lambda x: x.get('count', 0), reverse=True)
        # Limit suggestions to top 5 items
        suggestions = sorted_items[:5]
        return jsonify(suggestions), 200
    except Exception as e:
        logger.error(f"Error in /suggestions_based_on_history: {e}")
        return jsonify({"message": "Erro interno no servidor."}), 500

if __name__ == '__main__':
    app.run(debug=True)
