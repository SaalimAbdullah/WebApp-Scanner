const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());


const ZAP_API_BASE = 'http://localhost:8080/JSON';
const ZAP_API_KEY = 'p6ff145ioss2m1dv849s5ernp9'; // Replace with your ZAP API key

// console logs
function log(message, data = null, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    console.log(logMessage);
    if (data) console.log(`Details:`, data);
}

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
    log('Frontend served');
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// scan
app.post('/api/start-scan', async (req, res) => {
    const { target } = req.body;
    log(`Received scan request`, { target });

    try {
        // Spider scan
        const spiderResponse = await axios.get(`${ZAP_API_BASE}/spider/action/scan/`, {
            params: { url: target, apikey: ZAP_API_KEY },
        });
        const spiderId = spiderResponse.data.scan;
        log(`Spider started successfully`, { target, spiderId });

        // log progress
        let spiderStatus = '0';
        while (spiderStatus !== '100') {
            const statusResponse = await axios.get(`${ZAP_API_BASE}/spider/view/status/`, {
                params: { scanId: spiderId, apikey: ZAP_API_KEY },
            });
            spiderStatus = statusResponse.data.status;
            log(`Spider progress`, { target, spiderStatus });
            await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for 3 seconds
        }

        log(`Spider completed`, { target });

        // Active Scan
        const scanResponse = await axios.get(`${ZAP_API_BASE}/ascan/action/scan/`, {
            params: { url: target, apikey: ZAP_API_KEY },
        });
        const scanId = scanResponse.data.scan;
        log(`Active scan started successfully`, { target, scanId });

        res.json({ scanId }); // Return the scan ID
    } catch (error) {
        log(`Error starting scan`, { target, error: error.message }, 'ERROR');
        res.status(500).json({ error: error.message });
    }
});


// scan status
app.get('/api/scan-status/:scanId', async (req, res) => {
    const { scanId } = req.params;
    log(`Checking scan status`, { scanId });
    try {
        const response = await axios.get(`${ZAP_API_BASE}/ascan/view/status/`, {
            params: { scanId, apikey: ZAP_API_KEY },
        });
        log(`Scan status retrieved`, { scanId, status: response.data.status });
        res.json({ status: response.data.status });
    } catch (error) {
        log(`Error checking scan status`, { scanId, error: error.message }, 'ERROR');
        res.status(500).json({ error: error.message });
    }
});

// retrieve scan results
app.get('/api/scan-results', async (req, res) => {
    const { target } = req.query;
    log(`Retrieving scan results`, { target });
    try {
        const response = await axios.get(`${ZAP_API_BASE}/core/view/alerts/`, {
            params: { baseurl: target, apikey: ZAP_API_KEY },
        });
        log(`Scan results retrieved`, { target, alerts: response.data.alerts.length });
        res.json(response.data.alerts);
    } catch (error) {
        log(`Error retrieving scan results`, { target, error: error.message }, 'ERROR');
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => log(`App running at http://localhost:${PORT}`));
