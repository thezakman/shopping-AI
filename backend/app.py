from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime
import os
import logging

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

DATA_FILE = 'data.json'
COMMON_ITEMS_FILE = 'common_items.json'

# Configuração de Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_data():
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"items": []}

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def load_common_items():
    try:
        with open(COMMON_ITEMS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
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
        if not item:
            return jsonify({"message": "Nome do item é obrigatório."}), 400

        # Verificar se o item já existe (case insensitive)
        for existing_item in data['items']:
            if existing_item['name'].lower() == item.lower():
                return jsonify({"message": "Item já existe na lista."}), 400

        new_item = {
            'id': len(data['items']) + 1,
            'name': item,
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
        if not new_name:
            return jsonify({"message": "Nome do item é obrigatório."}), 400

        # Verificar se o novo nome já existe (case insensitive)
        for existing_item in data['items']:
            if existing_item['name'].lower() == new_name.lower() and existing_item['id'] != item_id:
                return jsonify({"message": "Outro item com esse nome já existe."}), 400

        item['name'] = new_name
        save_data(data)
        logger.info(f"Item atualizado: ID {item_id} para '{new_name}'")
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

if __name__ == '__main__':
    app.run(debug=True)