import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import logging

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://shopping-ai-1.onrender.com"}})

DATA_FILE = 'data.json'
COMMON_ITEMS_FILE = 'common_items.json'

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

# Função para carregar os itens comuns de um arquivo JSON
def load_common_items():
    try:
        with open(COMMON_ITEMS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('common_items', [])
    except FileNotFoundError:
        logger.warning(f"{COMMON_ITEMS_FILE} não encontrado. Retornando lista vazia.")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao decodificar {COMMON_ITEMS_FILE}: {e}")
        return []

# Função para gerar sugestões dinâmicas com base no histórico do usuário e itens comuns
@app.route('/dynamic_suggestions', methods=['GET'])
def dynamic_suggestions():
    try:
        logger.info("Carregando dados do histórico do usuário...")
        data = load_data()

        # Itens comuns que podem ser sugeridos
        common_items = load_common_items()

        # Ordenar os itens mais usados no histórico com base no campo 'count'
        sorted_items = sorted(data['items'], key=lambda x: x.get('count', 0), reverse=True)
        
        # Se o histórico for pequeno, incluir itens comuns como sugestão
        top_items = sorted_items[:10] if len(sorted_items) >= 10 else sorted_items + [{'name': item, 'count': 0} for item in common_items[:10 - len(sorted_items)]]

        # Remover duplicatas e formatar para resposta
        final_suggestions = [{'name': item['name'], 'occurrences': item.get('count', 1)} for item in top_items]
        
        return jsonify(final_suggestions), 200
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
                # Incrementar o contador se o item já existir
                existing_item['count'] = existing_item.get('count', 1) + 1
                save_data(data)
                return jsonify(existing_item), 200

        # Adicionar novo item
        new_item = {
            'id': len(data['items']) + 1,
            'name': item,
            'observation': observation,
            'date_added': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'count': 1,  # Inicializar o contador de ocorrências
            'purchased': False
        }
        data['items'].append(new_item)
        save_data(data)
        logger.info(f"Item adicionado: {item}")
        return jsonify(new_item), 201

# Função para salvar os dados no arquivo JSON
def save_data(data):
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Erro ao salvar dados: {e}")

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
    
@app.route('/suggestions', methods=['GET'])
def suggestions():
    try:
        logger.info("Carregando dados e itens comuns...")
        data = load_data()
        common_items = load_common_items()  # Carregar itens comuns do arquivo JSON
        item_names = [item['name'] for item in data['items']]

        # Combina itens comuns com itens do histórico do usuário
        combined_items = list(set(common_items + item_names))

        # Filtrar com base na query fornecida pelo usuário
        query = request.args.get('q', '').strip().lower()
        if not query:
            logger.warning("Nenhuma query fornecida para sugestões.")
            return jsonify([])

        # Filtra sugestões que começam com a query
        filtered_suggestions = [item for item in combined_items if item.lower().startswith(query)]
        logger.info(f"Sugestões filtradas para query '{query}': {filtered_suggestions}")

        # Retornar as 10 primeiras sugestões
        return jsonify(filtered_suggestions[:10])
    except Exception as e:
        logger.error(f"Erro ao gerar sugestões: {e}")
        return jsonify({"message": "Erro interno no servidor."}), 500

if __name__ == '__main__':
    app.run(debug=True)
