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

    // Carrega os itens na lista ao carregar a página
    loadItems();

    // Gera a nuvem de tags ao carregar a página
    generateTagCloud();

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
            if (status === 201 || status === 200) {
                loadItems(); // Recarregar a lista de itens
                generateTagCloud(); // Atualizar a nuvem de tags
                itemInput.value = '';
                clearAutocomplete();
                showNotification('Item adicionado com sucesso!', 'success');
            } else {
                showNotification(body.message || 'Erro ao adicionar item.', 'danger');
            }
        })
        .catch(error => {
            showNotification('Erro ao adicionar item.', 'danger');
            console.error('Erro:', error);
        });
    }

    // Remover item da lista
    function removeItem(id, element) {
        fetch(`${apiUrl}/items/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json().then(data => ({status: response.status, body: data})))
        .then(({status, body}) => {
            if (status === 200) {
                element.remove();
                generateTagCloud(); // Atualizar a nuvem de tags
                showNotification('Item removido com sucesso!', 'success');
            } else {
                showNotification(body.message || 'Erro ao remover item.', 'danger');
            }
        })
        .catch(error => {
            showNotification('Erro ao remover item.', 'danger');
            console.error('Erro:', error);
        });
    }

    // Alternar estado "comprado/não comprado" de um item
    function togglePurchased(id, checkbox) {
        fetch(`${apiUrl}/toggle_purchased/${id}`, {
            method: 'PATCH'
        })
        .then(response => response.json().then(data => ({status: response.status, body: data})))
        .then(({status, body}) => {
            if (status === 200) {
                const itemElement = checkbox.closest('.list-group-item');
                itemElement.classList.toggle('purchased', body.purchased);
                showNotification('Status do item atualizado!', 'success');
            } else {
                showNotification(body.message || 'Erro ao atualizar status.', 'danger');
            }
        })
        .catch(error => {
            showNotification('Erro ao atualizar status.', 'danger');
            console.error('Erro:', error);
        });
    }

    // Criar um item da lista
    function createListItem(item) {
        const li = document.createElement('li');
        li.className = `list-group-item ${item.purchased ? 'purchased' : ''}`;
        li.id = `item-${item.id}`;
        li.innerHTML = `
            <div class="item-info">
                <input type="checkbox" ${item.purchased ? 'checked' : ''} title="Marcar como Comprado">
                <div class="item-details">
                    <strong class="item-name">${capitalize(item.name)}</strong>
                    ${item.observation ? `<span class="item-observation">${capitalize(item.observation)}</span>` : ''}
                    <small class="item-date">Adicionado em: ${item.date_added}</small>
                </div>
            </div>
            <div class="action-buttons">
                <button class="btn edit-btn" title="Editar Item"><i class="fas fa-edit"></i></button>
                <button class="btn remove-btn" title="Remover Item"><i class="fas fa-trash"></i></button>
            </div>
        `;
        const checkbox = li.querySelector('input[type="checkbox"]');
        const editButton = li.querySelector('.edit-btn');
        const removeButton = li.querySelector('.remove-btn');
        checkbox.addEventListener('change', () => togglePurchased(item.id, checkbox));

        editButton.addEventListener('click', () => {
            editItem(item.id, item.name, item.observation);
        });

        removeButton.addEventListener('click', () => {
            removeItem(item.id, li);
        });

        return li;
    }

    // Função para gerar a nuvem de tags
    function generateTagCloud() {
        fetch(`${apiUrl}/dynamic_suggestions`)
            .then(response => response.json())
            .then(data => {
                const tagCloud = document.getElementById('tagCloud');
                tagCloud.innerHTML = ''; // Limpa a nuvem atual
    
                // Gerar a nuvem de tags
                data.forEach(item => {
                    const span = document.createElement('span');
                    span.textContent = capitalize(item.name); // Adiciona o nome do item
                    span.className = getTagClass(item.occurrences); // Define o tamanho da tag baseado na frequência
                    span.addEventListener('click', () => {
                        addItem(item.name, '');
                    });
                    tagCloud.appendChild(span);
                });
    
                showNotification('Nuvem de tags gerada com sucesso!', 'success');
            })
            .catch(error => {
                showNotification('Erro ao gerar a nuvem de tags.', 'danger');
                console.error('Erro:', error);
            });
    }

    // Função para definir o tamanho da tag com base na frequência de uso
    function getTagClass(occurrences) {
        if (occurrences > 5) return 'tag-large';
        if (occurrences > 2) return 'tag-medium';
        return 'tag-small';
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

    // Função de autocomplete ao buscar por sugestão
itemInput.addEventListener('input', debounce(fetchSuggestions, 300));

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

    
});
