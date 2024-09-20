const apiUrl = 'https://shopping-ai.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const itemInput = document.getElementById('itemInput');
    const addItemButton = document.getElementById('addItemButton');
    const itemsList = document.getElementById('itemsList');
    const autocompleteList = document.getElementById('autocomplete-list');
    const notification = document.getElementById('notification');

    const editItemModal = new bootstrap.Modal(document.getElementById('editItemModal'));
    const editItemInput = document.getElementById('editItemInput');
    const editItemObservation = document.getElementById('editItemObservation');
    const saveEditButton = document.getElementById('saveEditButton');
    let currentEditItemId = null;

    loadItems();

    // Adiciona novo item ao clicar no botão "Adicionar"
    addItemButton.addEventListener('click', () => {
        const item = itemInput.value.trim();
        const observation = '';
        if (item) {
            addItem(item, observation);
        }
    });

    // Adiciona novo item ao pressionar "Enter"
    itemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const item = itemInput.value.trim();
            const observation = '';
            if (item) {
                addItem(item, observation);
            }
        }
    });

    // Autocomplete ao digitar no campo de item
    itemInput.addEventListener('input', debounce(fetchSuggestions, 300));

    // Limpar autocomplete ao clicar fora do campo
    document.addEventListener('click', (e) => {
        if (e.target !== itemInput) {
            clearAutocomplete();
        }
    });

    // Carregar os itens da lista
    function loadItems() {
        fetch(`${apiUrl}/items`)
            .then(response => response.json())
            .then(data => {
                itemsList.innerHTML = '';
                data.forEach(item => {
                    const li = createListItem(item);
                    itemsList.appendChild(li);
                });
            })
            .catch(error => {
                showNotification('Erro ao carregar itens.', 'danger');
                console.error('Erro:', error);
            });
    }

    // Adicionar novo item
    function addItem(item, observation) {
        fetch(`${apiUrl}/items`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({item, observation})
        })
        .then(response => response.json().then(data => ({status: response.status, body: data})))
        .then(({status, body}) => {
            if (status === 201) {
                const li = createListItem(body);
                itemsList.appendChild(li);
                showNotification('Item adicionado com sucesso!', 'success');
                itemInput.value = '';
                clearAutocomplete();
                fetchSuggestions();
            } else {
                showNotification(body.message || 'Erro ao adicionar item.', 'danger');
            }
        })
        .catch(error => {
            showNotification('Erro ao adicionar item.', 'danger');
            console.error('Erro:', error);
        });
    }

    // Função para gerar a nuvem de tags
    document.getElementById('generateListButton').addEventListener('click', () => {
        fetch(`${apiUrl}/dynamic_suggestions`)
            .then(response => response.json())
            .then(data => {
                const tagCloud = document.getElementById('tagCloud');
                tagCloud.innerHTML = ''; // Limpa a nuvem atual
    
                // Gerar a nuvem de tags
                data.forEach(item => {
                    const span = document.createElement('span');
                    span.textContent = capitalize(item.name);
                    span.className = getTagClass(item.name, item.occurrences); // Define o tamanho da tag com base na frequência
                    span.addEventListener('click', () => addItem(item.name, ''));
                    tagCloud.appendChild(span);
                });
    
                showNotification('Nuvem de tags gerada com sucesso!', 'success');
            })
            .catch(error => {
                showNotification('Erro ao gerar a nuvem de tags.', 'danger');
                console.error('Erro:', error);
            });
    });

    // Função para definir o tamanho da tag com base na frequência
    function getTagClass(itemName, occurrences) {
        if (occurrences > 10) {
            return 'tag-large';
        } else if (occurrences > 5) {
            return 'tag-medium';
        } else {
            return 'tag-small';
        }
    }

    // Função de autocomplete ao buscar por sugestão
    function fetchSuggestions() {
        const query = itemInput.value.trim().toLowerCase();
        if (query.length === 0) {
            clearAutocomplete();
            return;
        }

        fetch(`${apiUrl}/suggestions?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(suggestions => {
                showAutocomplete(suggestions);
            })
            .catch(error => {
                console.error('Erro ao buscar sugestões:', error);
            });
    }

    // Exibir a lista de sugestões no autocomplete
    function showAutocomplete(suggestions) {
        clearAutocomplete();
        if (suggestions.length === 0) return;

        suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.textContent = suggestion;
            li.addEventListener('click', () => {
                itemInput.value = suggestion;
                clearAutocomplete();
                itemInput.focus();
            });
            autocompleteList.appendChild(li);
        });
    }

    // Limpar a lista de autocomplete
    function clearAutocomplete() {
        autocompleteList.innerHTML = '';
    }

    // Função de debounce para melhorar a performance ao buscar sugestões
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
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Exibir notificação na tela
    function showNotification(message, type) {
        notification.className = `alert alert-${type}`;
        notification.textContent = message;
        notification.classList.remove('d-none');
        setTimeout(() => {
            notification.classList.add('d-none');
        }, 3000);
    }
});
