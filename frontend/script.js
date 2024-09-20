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

    // Remover item da lista
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

    // Alternar estado "comprado/não comprado" de um item
    function togglePurchased(id, checkbox) {
        fetch(`${apiUrl}/toggle_purchased/${id}`, {
            method: 'PATCH'
        })
        .then(response => response.json().then(data => ({status: response.status, body: data})))
        .then(({status, body}) => {
            if (status === 200) {
                const itemElement = checkbox.closest('.list-group-item');
                if (body.purchased) {
                    checkbox.checked = true;
                    itemElement.classList.add('purchased');
                } else {
                    checkbox.checked = false;
                    itemElement.classList.remove('purchased');
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

    // Editar item da lista
    function editItem(id, currentName, currentObservation) {
        currentEditItemId = id;
        editItemInput.value = currentName;
        editItemObservation.value = currentObservation;
        editItemModal.show();
    }

    // Salvar edições no item
    saveEditButton.addEventListener('click', () => {
        const newName = editItemInput.value.trim();
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
                const itemElement = document.getElementById(`item-${body.id}`);
                if (itemElement) {
                    itemElement.querySelector('.item-name').textContent = body.name;
                    itemElement.querySelector('.item-date').textContent = `Adicionado em: ${body.date_added}`;
                    itemElement.querySelector('.item-observation').textContent = body.observation;
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

    // Função para buscar sugestões baseadas no histórico e nos itens destacados
    document.getElementById('generateListButton').addEventListener('click', () => {
        fetch(`${apiUrl}/dynamic_suggestions`)
            .then(response => response.json())
            .then(data => {
                itemsList.innerHTML = ''; // Limpa a lista atual
                data.forEach(item => {
                    const li = createListItem({name: item, date_added: new Date().toLocaleString()}); // Cria um item da lista
                    itemsList.appendChild(li);
                });
                showNotification('Lista gerada com base no histórico e destaques!', 'success');
            })
            .catch(error => {
                showNotification('Erro ao gerar a lista.', 'danger');
                console.error('Erro:', error);
            });
    });
    

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
