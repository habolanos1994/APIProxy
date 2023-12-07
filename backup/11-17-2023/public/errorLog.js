window.onload = function() {
    fetch('/getErrorLog')
    .then(response => response.text())
    .then(data => {
        const parsedData = Papa.parse(data, {header: true}).data;
        const table = document.getElementById('error-log-table');
        
        const headerRow = document.createElement('tr');
        for (let key in parsedData[0]) {
            const th = document.createElement('th');
            th.textContent = key;
            headerRow.appendChild(th);
        }
        table.appendChild(headerRow);

        parsedData.forEach(item => {
            const row = document.createElement('tr');
            for (let key in item) {
                const td = document.createElement('td');
                td.textContent = item[key];
                row.appendChild(td);
            }
            table.appendChild(row);
        });
    });
}

function clearLog() {
    fetch('/clearErrorLog', {method: 'POST'})
    .then(() => {
        document.getElementById('error-log-table').innerHTML = '';
    });
}
