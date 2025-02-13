const form = document.getElementById('scan-form');
const output = document.getElementById('output');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const target = document.getElementById('target').value;
    output.innerHTML = '<p>Starting scan...</p>';

    try {
        const startResponse = await fetch('http://localhost:3000/api/start-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target }),
        });
        const { scanId } = await startResponse.json();

        const checkStatus = async () => {
            const statusResponse = await fetch(`http://localhost:3000/api/scan-status/${scanId}`);
            const { status } = await statusResponse.json();
            if (status === '100') {
                const resultsResponse = await fetch(`http://localhost:3000/api/scan-results?target=${encodeURIComponent(target)}`);
                const results = await resultsResponse.json();
                displayResults(results);
            } else {
                output.innerHTML = `<p>Scan in progress: ${status}%</p>`;
                setTimeout(checkStatus, 3000);
            }
        };

        checkStatus();
    } catch (error) {
        output.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});


function displayResults(results) {
    if (!results.length) {
        output.innerHTML = '<p>No vulnerabilities found.</p>';
        return;
    }

    // Group vulnerabilities by their name
    const groupedResults = results.reduce((acc, alert) => {
        if (!acc[alert.name]) {
            acc[alert.name] = { ...alert, urls: [] };
        }
        acc[alert.name].urls.push(alert.url || 'Unknown URL');
        return acc;
    }, {});

    // Create table 
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Alert</th>
                    <th>Description</th>
                    <th>Risk</th>
                    <th>Solution</th>
                </tr>
            </thead>
            <tbody>
    `;

    Object.values(groupedResults).forEach(alert => {
        tableHTML += `
            <tr>
                <td>
                    ${alert.name}
                    <div class="tooltip">
                        <span>🔍</span>
                        <div class="tooltip-content">
                            ${alert.urls.map(url => `<p>${url}</p>`).join('')}
                        </div>
                    </div>
                </td>
                <td>${alert.description}</td>
                <td>${alert.risk}</td>
                <td>${alert.solution || 'No solution provided'}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    output.innerHTML = tableHTML;
}

