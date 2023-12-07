window.onload = function() {
    fetch('/getAPIMode')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('api-container');
            for (let key in data.ActiveAPI) {
                const item = document.createElement('div');
                item.textContent = `${key}: ${data.ActiveAPI[key]}`;
                item.classList.add('api-item');
                container.appendChild(item);
            }
        });
};
