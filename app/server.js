const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT;

// Serve static files from the 'src/pages' folder
app.use(express.static(path.join(__dirname, 'src', 'pages')));
const logFilePath = path.join(__dirname, 'incidents.txt');

// To parse my POST requests
app.use(express.json());

// Serve the main index.html from the 'src/pages' folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'index.html'));
});

// Create a WebSocket server that shares the same HTTP server
const wsServer = new WebSocket.Server({ server });

wsServer.on('connection', (socket) => {
    console.log("A client just connected");
  
    socket.on('message', (msg) => {
        //console.log("Received message from client: ", msg);
        
        // Broadcast the message to all connected clients
        wsServer.clients.forEach((client) => {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        });
    });
});

// When receive incident POST, record data in respective files
app.post('/incident', (req, res) => {
    const { action, cam, time, duration, counter } = req.body;  
    let logData;

    if (action === "report") {
        logData = `${time}: Incident on CAM${cam} reported.\n`;
    } else if (action === "resolved") {
        logData = `${time}: Incident on CAM${cam} resolved. Incident lasted: ${duration}seconds\nTOTAL INCIDENTS ON CAM${cam}: ${counter}\n`;
    } else {
        logData = "ERROR";
    }

    try {
        const baseLogPath = path.join(__dirname, 'src', 'pages');
        const logFilePaths = [
            path.join(baseLogPath, 'incidents.txt'),
            path.join(baseLogPath, `CAM${cam}Report.txt`)
        ];

        logFilePaths.forEach(filePath => {
            console.log(`Writing to: ${filePath}`);
            fs.appendFileSync(filePath, logData, 'utf8');
        });

        // Send success response
        res.json({ message: 'Incident logged' });
    } catch (err) {
        console.error("Error writing to file:", err);
        res.status(500).json({ error: 'Error writing to file' });
    }
});

// When refresh POST received call refresh func
app.post('/refresh', async (req, res) => {
    try {
        // Call the refresh function
        const result = await refreshProject();
        console.log('Project refreshed:', result);
        res.json({ message: 'Project refreshed successfully' });
    } catch (err) {
        console.error('Error refreshing project:', err);
        res.status(500).json({ error: 'Error refreshing project' });
    }
});

// Function to trigger refresh so backend files visually reflect data
function refreshProject() {
    return new Promise((resolve, reject) => {
        exec('refresh', (err, stdout, stderr) => {
            if (err) {
                reject('Error executing refresh:', err);
                return;
            }
            resolve(stdout);
        });
    });
}

// When reset POST received, clear txt files
app.post('/reset', async (req, res) => {
	const baseLogPath = path.join(__dirname, 'src', 'pages');
	const logFilePaths = [
    	path.join(baseLogPath, 'incidents.txt'),
    	path.join(baseLogPath, 'CAM1Report.txt'),
    	path.join(baseLogPath, 'CAM2Report.txt')
	];

	try {
    	await Promise.all(logFilePaths.map(filePath =>
        	fs.promises.writeFile(filePath, '', 'utf8')
    	));
    	res.json({ message: 'Project reset successfully' });
	} catch (err) {
    	console.error('Error resetting project:', err);
    	res.status(500).json({ error: 'Error resetting project' });
	}
});


// Start the server
server.listen(PORT, () => {
    console.log(`${new Date()} - Server is listening on port ${PORT}`);
});
