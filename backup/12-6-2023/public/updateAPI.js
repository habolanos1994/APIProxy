const serviceSelect = document.getElementById('serviceSelect');
const proxyModeContainer = document.getElementById('proxyModeContainer');
const proxyURLContainer = document.getElementById('proxyURLContainer');
let servicesData = [];


function createProxyModeDropdown(apiRequest, mode) {
    const label = document.createElement('label');
    label.textContent = `${apiRequest === 'proxyMode' ? '' : apiRequest + ': '}`; // Adjust label text
    const select = document.createElement('select');
    select.name = apiRequest === 'proxyMode' ? 'proxyMode' : `proxyMode[${apiRequest}]`; // Adjust the name attribute
    ['http', 'https', 'StantAalone', 'test'].forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = value === mode;
        select.appendChild(option);
    });
    proxyModeContainer.appendChild(label);
    proxyModeContainer.appendChild(select);
}

function createProxyURLTextbox(key, url) {
    const label = document.createElement('label');
    label.textContent = `${key} URL: `;
    const textarea = document.createElement('textarea');
    textarea.name = `proxyURL[${key}]`;
    textarea.rows = 2;
    textarea.style.width = '100%';
    textarea.textContent = url;
    proxyURLContainer.appendChild(label);
    proxyURLContainer.appendChild(textarea);
}

function handleServiceChange() {
    const selectedService = servicesData.find(service => service.ServiceName === serviceSelect.value);
    if (selectedService) {
        // Clear existing content
        while (proxyModeContainer.firstChild) {
            proxyModeContainer.removeChild(proxyModeContainer.firstChild);
        }
        while (proxyURLContainer.firstChild) {
            proxyURLContainer.removeChild(proxyURLContainer.firstChild);
        }

        // Handle ProxyMode
        if (typeof selectedService.ProxyMode === 'object') {
            Object.keys(selectedService.ProxyMode).forEach(apiRequest => {
                createProxyModeDropdown(apiRequest, selectedService.ProxyMode[apiRequest]);
            });
        } else {
            createProxyModeDropdown('proxyMode', selectedService.ProxyMode); // Handle string type ProxyMode
        }

        // Handle PROXYURL
        Object.entries(selectedService.PROXYURL).forEach(([key, url]) => {
            createProxyURLTextbox(key, url);
        });
    }
}

window.onload = function() {
    fetch('/api/getAPIMode')
        .then(response => response.json())
        .then(services => {
            servicesData = services;
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.ServiceName;
                option.textContent = service.ServiceName;
                serviceSelect.appendChild(option);
            });

            if (services.length > 0) {
                handleServiceChange();
            }
        })
        .catch(error => {
            console.error('Error fetching service names:', error);
        });

    serviceSelect.addEventListener('change', handleServiceChange);

    document.getElementById('updateButton').addEventListener('click', function() {
        const service = serviceSelect.value;
        const proxyMode = {};
        document.querySelectorAll('#proxyModeContainer select').forEach(select => {
            proxyMode[select.name] = select.value;
        });
        const proxyURL = {};
        document.querySelectorAll('#proxyURLContainer textarea').forEach(textarea => {
            const key = textarea.name.match(/\[(.*?)\]/)[1];
            proxyURL[key] = textarea.value;
        });

        fetch('/api/updateAPI', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ service, proxyMode, proxyURL }),
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            if (data.redirect) {
                window.location.href = data.redirect; // Redirect based on server response
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });
};
