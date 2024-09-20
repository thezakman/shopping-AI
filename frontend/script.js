const apiUrl = 'https://shopping-ai.onrender.com'; // URL do backend no Render

document.addEventListener('DOMContentLoaded', () => {
    const itemInput = document.getElementById('itemInput');
    const addItemButton = document.getElementById('addItemButton');
    const itemsList = document.getElementById('itemsList');
    const autocompleteList = document.getElementById('autocomplete-list');
    const notification = document.getElementById('notification');

    // Elementos do Modal de Edição
    const editItemModal = new bootstrap.Modal(document.getElementById('editItemModal'));
    const editItemName = document.getElementById('editItemName');
    const editItemObservation = document.getElementById('editItemObservation');
    const saveEditButton = document.getElementById('saveEditButton');
    let currentEditItemId = null;

    // Carregar itens ao iniciar
    loadItems();

    // Adicionar item ao clicar no botão
    addItemButton.addEventListener('click', () => {
        const item = itemInput.value.trim();
        if (item) {
            const observation = ''; // Observação vazia ao adicionar via input principal
            addItem(item, observation);
        }
    });

    // Adicionar item ao pressionar Enter
    itemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const item = itemInput.value.trim();
            if (item) {
                const observation = ''; // Observação vazia ao adicionar via input principal
                addItem(item, observation);
            }
        }
    });

    // Autocomplete ao digitar
    itemInput.addEventListener('input', debounce(fetchSuggestions, 300));

    // Fechar autocomplete ao clicar fora
    document.addEventListener('click', (e) => {
        if (e.target !== itemInput) {
            clearAutocomplete();
        }
    });

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
            })
            .catch(error => {
                showNotification('Erro ao carregar itens.', 'danger');
                console.error('Erro:', error);
            });
    }

    // Função para adicionar item
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

    // Função para remover item
    function removeItem(id, element) {
        fetch(`${apiUrl}/items/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json().then(data => ({status: response.status, body: data})))
        .then(({status, body}) => {
            if (status === 200) {
                element.remove();
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

    // Função para alternar status de comprado
    function togglePurchased(id, checkbox) {
        fetch(`${apiUrl}/toggle_purchased/${id}`, {
            method: 'PATCH'
        })
        .then(response => response.json().then(data => ({status: response.status, body: data})))
        .then(({status, body}) => {
            if (status === 200) {
                const itemName = document.querySelector(`#item-${id} .item-name`);
                if (body.purchased) {
                    checkbox.checked = true;
                    itemName.classList.add('purchased');
                } else {
                    checkbox.checked = false;
                    itemName.classList.remove('purchased');
                }
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

    // Função para editar item
    function editItem(id, currentName, currentObservation) {
        currentEditItemId = id;
        editItemName.value = currentName;
        editItemObservation.value = currentObservation;
        editItemModal.show();
    }

    // Salvar edição de item
    saveEditButton.addEventListener('click', () => {
        const newName = editItemName.value.trim();
        const newObservation = editItemObservation.value.trim();
        if (!newName) {
            showNotification('Nome do item não pode ser vazio.', 'warning');
            return;
        }

        fetch(`${apiUrl}/items/${currentEditItemId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: newName, observation: newObservation})
        })
        .then(response => response.json().then(data => ({status: response.status, body: data})))
        .then(({status, body}) => {
            if (status === 200) {
                // Atualizar o item na lista
                const itemElement = document.getElementById(`item-${body.id}`);
                if (itemElement) {
                    itemElement.querySelector('.item-name').textContent = body.name;
                    itemElement.querySelector('.item-date').textContent = `Adicionado em: ${body.date_added}`;
                    itemElement.querySelector('.item-observation').textContent = body.observation ? `Observação: ${body.observation}` : '';
                }
                showNotification('Item atualizado com sucesso!', 'success');
                editItemModal.hide();
            } else {
                showNotification(body.message || 'Erro ao atualizar item.', 'danger');
            }
        })
        .catch(error => {
            showNotification('Erro ao atualizar item.', 'danger');
            console.error('Erro:', error);
        });
    });

    // Função para criar elemento da lista
    function createListItem(item) {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.id = `item-${item.id}`;
        li.innerHTML = `
            <div class="item-info">
                <input type="checkbox" ${item.purchased ? 'checked' : ''} title="Marcar como Comprado">
                <div>
                    <strong class="item-name ${item.purchased ? 'purchased' : ''}">${capitalize(item.name)}</strong>
                    <br>
                    <small class="item-date">Adicionado em: ${item.date_added}</small>
                    <p class="item-observation">${item.observation ? `Observação: ${item.observation}` : ''}</p>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-sm me-2" title="Editar Item">✏️</button>
                <button class="btn btn-danger btn-sm" title="Remover Item">🗑️</button>
            </div>
        `;
        const [checkbox, editButton, removeButton] = li.querySelectorAll('input, button');

        // Evento para alternar status de comprado
        checkbox.addEventListener('change', () => {
            togglePurchased(item.id, checkbox);
        });

        // Evento para editar item
        editButton.addEventListener('click', () => {
            editItem(item.id, item.name, item.observation);
        });

        // Evento para remover item
        removeButton.addEventListener('click', () => {
            removeItem(item.id, li);
        });

        return li;
    }

    // Função para buscar sugestões
    function fetchSuggestions() {
        const query = itemInput.value.trim().toLowerCase();
        if (query.length === 0) {
            clearAutocomplete();
            return;
        }

        fetch(`${apiUrl}/suggestions?q=${encodeURIComponent(query)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao buscar sugestões.');
                }
                return response.json();
            })
            .then(suggestions => {
                showAutocomplete(suggestions);
            })
            .catch(error => {
                console.error('Erro ao buscar sugestões:', error);
            });
    }

    // Função para mostrar autocomplete
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

    // Função para limpar autocomplete
    function clearAutocomplete() {
        autocompleteList.innerHTML = '';
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
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Função para mostrar notificações
    function showNotification(message, type) {
        notification.className = `alert alert-${type}`;
        notification.textContent = message;
        notification.classList.remove('d-none');
        setTimeout(() => {
            notification.classList.add('d-none');
        }, 3000);
    }
});
