from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://shopping-ai.onrender.com"}})

DATA_FILE = 'data.json'

def load_data():
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"items": []}

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/items', methods=['GET', 'POST', 'DELETE'])
def manage_items():
    data = load_data()
    if request.method == 'GET':
        return jsonify(data['items'])
    
    if request.method == 'POST':
        item = request.json.get('item')
        if item:
            data['items'].append({
                'id': len(data['items']) + 1,
                'name': item,
                'date_added': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            save_data(data)
            return jsonify({"message": "Item added"}), 201
    
    if request.method == 'DELETE':
        item_id = request.args.get('id')
        data['items'] = [item for item in data['items'] if item['id'] != int(item_id)]
        save_data(data)
        return jsonify({"message": "Item removed"}), 200

@app.route('/suggestions', methods=['GET'])
def suggestions():
    data = load_data()
    frequency = {}
    for item in data['items']:
        name = item['name'].lower()
        frequency[name] = frequency.get(name, 0) + 1
    sorted_items = sorted(frequency.items(), key=lambda x: x[1], reverse=True)
    suggestions = [item[0].capitalize() for item in sorted_items[:5]]
    return jsonify(suggestions)

if __name__ == '__main__':
    app.run(debug=True)
