const serviceSelect = document.getElementById('serviceSelect');
const proxyModeContainer = document.getElementById('proxyModeContainer');
const proxyURLContainer = document.getElementById('proxyURLContainer');

let servicesData = [];

function createProxyModeDropdown(apiRequest, mode) {
    const label = document.createElement('label');
    label.textContent = `${apiRequest === 'proxyMode' ? '' : apiRequest + ': '}`;
    const select = document.createElement('select');
    select.name = apiRequest === 'proxyMode' ? 'proxyMode' : `proxyMode[${apiRequest}]`;
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

function createStringToArrayEnableDropdown(enable) {
    const label = document.createElement('label');
    label.textContent = 'String To Array Enable: ';
    const select = document.createElement('select');
    select.id = 'stringToArrayEnable';
    ['true', 'false'].forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = value === enable.toString();
        select.appendChild(option);
    });
    proxyModeContainer.appendChild(label);
    proxyModeContainer.appendChild(select);
}

function createStringToArrayuseSingleRequestsDropdown(enable) {
    const label = document.createElement('label');
    label.textContent = 'Use single requests Enable: ';
    const select = document.createElement('select');
    select.id = 'useSingleRequests';
    ['true', 'false'].forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = value === enable.toString();
        select.appendChild(option);
    });
    proxyModeContainer.appendChild(label);
    proxyModeContainer.appendChild(select);
}

function createStringToArrayDelimiterTextbox(delimiter) {
    const label = document.createElement('label');
    label.textContent = 'String To Array Delimiter: ';
    const input = document.createElement('input');
    input.id = 'stringToArrayDelimiter';
    input.type = 'text';
    input.value = delimiter;
    input.style.width = '100%';
    proxyURLContainer.appendChild(label);
    proxyURLContainer.appendChild(input);
}

function handleServiceChange() {
    const selectedService = servicesData.find(service => service.ServiceName === serviceSelect.value);
    if (selectedService) {
        while (proxyModeContainer.firstChild) {
            proxyModeContainer.removeChild(proxyModeContainer.firstChild);
        }
        while (proxyURLContainer.firstChild) {
            proxyURLContainer.removeChild(proxyURLContainer.firstChild);
        }

        if (typeof selectedService.ProxyMode === 'object') {
            Object.keys(selectedService.ProxyMode).forEach(apiRequest => {
                createProxyModeDropdown(apiRequest, selectedService.ProxyMode[apiRequest]);
            });
        } else {
            createProxyModeDropdown('proxyMode', selectedService.ProxyMode);
        }

        Object.entries(selectedService.PROXYURL).forEach(([key, url]) => {
            createProxyURLTextbox(key, url);
        });

        createStringToArrayEnableDropdown(selectedService.stringToArray.enable);
        createStringToArrayDelimiterTextbox(selectedService.stringToArray.delimiter);
        createStringToArrayuseSingleRequestsDropdown(selectedService.stringToArray.useSingleRequests);
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
        const stringToArrayEnable = document.getElementById('stringToArrayEnable').value === 'true';
        const stringToArraySingleRequests = document.getElementById('useSingleRequests').value === 'true';
        const stringToArrayDelimiter = document.getElementById('stringToArrayDelimiter').value;

        fetch('/api/updateAPI', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ service, proxyMode, proxyURL, stringToArrayDelimiter, stringToArrayEnable, stringToArraySingleRequests }),
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            if (data.redirect) {
                window.location.href = data.redirect;
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });
};
