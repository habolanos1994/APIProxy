window.onload = function() {
    fetch('/api/getAPIMode')
        .then(response => response.json())
        .then(services => {
            const container = document.getElementById('api-container');
            services.forEach(service => {
                const serviceDiv = document.createElement('div');
                serviceDiv.classList.add('api-item');

                // Create elements to display each service's details
                const serviceName = document.createElement('h4');
                serviceName.textContent = `Service: ${service.ServiceName}`;
                serviceDiv.appendChild(serviceName);

                const tcpApiPort = document.createElement('p');
                tcpApiPort.textContent = `TCP API Port: ${service.TCPAPIPort}`;
                serviceDiv.appendChild(tcpApiPort);

                // ... add other service details in a similar way ...

                const proxyMode = document.createElement('p');
                proxyMode.textContent = `Proxy Mode: ${service.ProxyMode}`;
                serviceDiv.appendChild(proxyMode);

                const stringToArrayEnable = document.createElement('p');
                stringToArrayEnable.textContent = `stringToArrayenable: ${service.stringToArray.enable}`;
                serviceDiv.appendChild(stringToArrayEnable);

                const stringToArrayDelimiter = document.createElement('p');
                stringToArrayDelimiter.textContent = `stringToArrayDelimiter: ${service.stringToArray.delimiter}`;
                serviceDiv.appendChild(stringToArrayDelimiter);

                const stringToArrayuseSingleRequests = document.createElement('p');
                stringToArrayuseSingleRequests.textContent = `stringToArrayuseSingleRequests: ${service.stringToArray.useSingleRequests}`;
                serviceDiv.appendChild(stringToArrayuseSingleRequests);


                const activeUrl = document.createElement('p');
                activeUrl.textContent = `Active URL: ${service.activeURL}`;
                serviceDiv.appendChild(activeUrl);

                // Append the entire serviceDiv to the container
                container.appendChild(serviceDiv);
            });
        });
};
