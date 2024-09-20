const apiUrl = 'https://shopping-ai-backend.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const itemInput = document.getElementById('itemInput');
    const addItemButton = document.getElementById('addItemButton');
    const itemsList = document.getElementById('itemsList');

    // Carregar itens ao iniciar
    loadItems();

    // Adicionar item
    addItemButton.addEventListener('click', () => {
        const item = itemInput.value.trim();
        if (item) {
            addItem(item);
            itemInput.value = '';
        }
    });

    // Autocomplete
    itemInput.addEventListener('input', debounce(fetchSuggestions, 300));

    // Função para carregar itens
    function loadItems() {
        fetch(`${apiUrl}/items`)
            .then(response => response.json())
            .then(data => {
                itemsList.innerHTML = '';
                data.forEach(item => {
                    const li = createListItem(item);
                    itemsList.appendChild(li);
                });
            });
    }

    // Função para adicionar item
    function addItem(item) {
        fetch(`${apiUrl}/items`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({item})
        })
        .then(response => {
            if (response.ok) {
                loadItems();
                fetchSuggestions(); // Atualizar sugestões
            }
        });
    }

    // Função para remover item
    function removeItem(id) {
        fetch(`${apiUrl}/items?id=${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                loadItems();
            }
        });
    }

    // Função para criar elemento da lista
    function createListItem(item) {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <div>
                <strong>${capitalize(item.name)}</strong>
                <br>
                <small>Adicionado em: ${item.date_added}</small>
            </div>
            <button class="btn btn-danger btn-sm" onclick="removeItem(${item.id})">Remover</button>
        `;
        return li;
    }

    // Função para buscar sugestões
    function fetchSuggestions() {
        const query = itemInput.value.trim().toLowerCase();
        if (query.length === 0) return;

        fetch(`${apiUrl}/suggestions`)
            .then(response => response.json())
            .then(suggestions => {
                showAutocomplete(suggestions.filter(s => s.toLowerCase().startsWith(query)));
            });
    }

    // Função para mostrar autocomplete
    function showAutocomplete(suggestions) {
        // Remover sugestões anteriores
        const existingList = document.getElementById('autocomplete-list');
        if (existingList) existingList.remove();

        if (suggestions.length === 0) return;

        const list = document.createElement('ul');
        list.id = 'autocomplete-list';
        list.className = 'list-group position-absolute';
        list.style.zIndex = '1000';
        list.style.width = '100%';

        suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.textContent = suggestion;
            li.addEventListener('click', () => {
                itemInput.value = suggestion;
                list.remove();
            });
            list.appendChild(li);
        });

        itemInput.parentNode.appendChild(list);
    }

    // Função debounce para otimizar chamadas de autocomplete
    function debounce(func, delay) {
        let debounceTimer;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // Função para capitalizar strings
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Tornar a função removeItem acessível no escopo global
    window.removeItem = removeItem;
});
