window.onload = function() {
    fetch('/getAPIMode')
        .then(response => response.json())
        .then(data => {
            const apiContainer = document.getElementById('api-container');
            if (apiContainer) {
                displayAPIs(data.ActiveAPI, 'ActiveAPI', apiContainer);
            }

            const serviceSelect = document.getElementById('service');
            const optionSelect = document.getElementById('option');
            if (serviceSelect && optionSelect) {
                populateDropdowns(data);
            }
        });

    setupFormSubmissions();
};

function setupFormSubmissions() {
    const editForm = document.getElementById('edit-api-form');
    if (editForm) {
        editForm.onsubmit = function(event) {
            event.preventDefault();
            submitEdit();
        };
    }

    const updateForm = document.getElementById('update-api-form');
    if (updateForm) {
        updateForm.onsubmit = function(event) {
            event.preventDefault();
            submitUpdate();
        };
    }
}



function populateDropdowns(data) {
    const serviceSelect = document.getElementById('service');
    const optionSelect = document.getElementById('option');

    for (let key in data.ActiveAPI) {
        let option = new Option(key, key);
        serviceSelect.appendChild(option);
    }

    for (let key in data.URLAPI) {
        let option = new Option(key, key);
        optionSelect.appendChild(option);
    }
}

function displayAPIs(apis, section, container) {
    for (let key in apis) {
        const item = document.createElement('div');
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.onclick = () => populateEditForm(section, key, apis[key]);

        item.textContent = `${key}: ${apis[key]} `;
        item.appendChild(editButton);
        item.classList.add('api-item');
        container.appendChild(item);
    }
}

function populateEditForm(section, key, value) {
    const form = document.getElementById('edit-api-form');
    form.style.display = 'block';
    form.action = '/editAPI';
    document.getElementById('edit-api-name').value = `${section}.${key}`;
    document.getElementById('edit-api-value').value = value;
}

function submitEdit() {
    const name = document.getElementById('edit-api-name').value.split('.');
    const value = document.getElementById('edit-api-value').value;

    fetch('/editAPI', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            section: name[0],
            key: name[1],
            newValue: value
        }),
    })
    .then(response => response.json())
    .then(data => {
        alert('API updated successfully!');
        location.reload();
    })
    .catch(error => console.error('Error:', error));
}

function submitUpdate() {
    // Implementation for the Update form submission
    // You need to define the logic based on your requirement
}
