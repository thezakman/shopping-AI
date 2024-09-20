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

    addItemButton.addEventListener('click', () => {
        const item = itemInput.value.trim();
        const observation = '';
        if (item) {
            addItem(item, observation);
        }
    });

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

    itemInput.addEventListener('input', debounce(fetchSuggestions, 300));

    document.addEventListener('click', (e) => {
        if (e.target !== itemInput) {
            clearAutocomplete();
        }
    });

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
                itemsList.insertBefore(li, itemsList.firstChild);
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

    function togglePurchased(id, checkbox) {
        fetch(`${apiUrl}/toggle_purchased/${id}`, {
            method: 'PATCH'
        })
        .then(response => response.json().then(data => ({status: response.status, body: data})))
        .then(({status, body}) => {
            if (status === 200) {
                const listItem = checkbox.closest('.list-group-item');
                if (body.purchased) {
                    checkbox.checked = true;
                    listItem.classList.add('purchased');
                } else {
                    checkbox.checked = false;
                    listItem.classList.remove('purchased');
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

    function editItem(id, currentName, currentObservation) {
        currentEditItemId = id;
        editItemInput.value = currentName;
        editItemObservation.value = currentObservation;
        editItemModal.show();
    }

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

    function createListItem(item) {
        const li = document.createElement('li');
        li.className = `list-group-item ${item.purchased ? 'purchased' : ''}`;
        li.id = `item-${item.id}`;
        li.innerHTML = `
            <div class="item-info">
                <input type="checkbox" class="custom-checkbox" ${item.purchased ? 'checked' : ''} title="Marcar como Comprado">
                <div class="item-details">
                    <span class="item-name">${capitalize(item.name)}</span>
                    ${item.observation ? `<span class="item-observation">${capitalize(item.observation)}</span>` : ''}
                    <small class="item-date">Adicionado em: ${item.date_added}</small>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-outline-secondary btn-action" title="Editar Item">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline-danger btn-action" title="Remover Item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        const [checkbox, editButton, removeButton] = li.querySelectorAll('input, button');

        checkbox.addEventListener('change', () => {
            togglePurchased(item.id, checkbox);
        });

        editButton.addEventListener('click', () => {
            editItem(item.id, item.name, item.observation);
        });

        removeButton.addEventListener('click', () => {
            removeItem(item.id, li);
        });

        return li;
    }

    function fetchSuggestions() {
        const query = itemInput.value.trim().toLowerCase();
        if (query.length === 0) {
            clearAutocomplete();
            return;
        }

        fetch(`${apiUrl}/suggestions?q=${encodeURIComponent(query)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro na requisição de sugestões.');
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

    function clearAutocomplete() {
        autocompleteList.innerHTML = '';
    }

    function debounce(func, delay) {
        let debounceTimer;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function showNotification(message, type) {
        notification.className = `alert alert-${type}`;
        notification.textContent = message;
        notification.classList.remove('d-none');
        setTimeout(() => {
            notification.classList.add('d-none');
        }, 3000);
    }
});