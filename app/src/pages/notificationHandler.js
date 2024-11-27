const socket = new WebSocket('wss://ablaze-secret-fig.glitch.me');
socket.binaryType = "arraybuffer";

const frameQueues = { videoBox1: [], videoBox2: [] }; // Separate queues for each video box
const isPlaying = { videoBox1: false, videoBox2: false };
const incidentTimes = { videoBox1: 0, videoBox2: 0 }; // To store the time of the incident
let CAM1active = false; //incident being recorded on CAM1
let CAM2active = false; //incident being recorded on CAM2
const incidentCounters = { 
  videoBox1: parseInt(localStorage.getItem('incidentCounterVideoBox1')) || 0,
  videoBox2: parseInt(localStorage.getItem('incidentCounterVideoBox2')) || 0 
};
//to ensure the total incidents remain consistent across page refreshes
function updateLocalStorage() { 
  localStorage.setItem('incidentCounterVideoBox1', incidentCounters.videoBox1); 
  localStorage.setItem('incidentCounterVideoBox2', incidentCounters.videoBox2); }

//play next frame in the queue
function playNextFrame(queue, elementId) {
    if (frameQueues[queue].length > 0) {
        const frame = frameQueues[queue].shift();
        const base64Image = btoa(
            new Uint8Array(frame)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const imageElement = document.getElementById(elementId);
        imageElement.src = `data:image/jpeg;base64,${base64Image}`;
    }

    if (frameQueues[queue].length > 0 || isPlaying[queue]) {
        setTimeout(() => playNextFrame(queue, elementId), 33); // ~30 FPS
    }
}

socket.addEventListener('open', () => {
    console.log('WebSocket connection is open.');
});

// Listen for button and video data from cameras
socket.addEventListener('message', (event) => {
    let date;
    if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        console.log('Received alert:', data);
        
        if (data.box === 'videoBox1' && !CAM1active) {
          CAM1active = true;
          incidentTimes.videoBox1 = new Date();
          date = incidentTimes.videoBox1.toLocaleString('en-US', { timeZone: 'America/New_York' });
          incidentCounters.videoBox1++;
          updateLocalStorage();
          // Send the incident report to the server
         sendDataToServer('report', 1, date, 'NA', 'NA' );
          
        } else if (data.box === 'videoBox2' && !CAM2active) {
          CAM2active= true;
          incidentTimes.videoBox2 = new Date();
          date = incidentTimes.videoBox1.toLocaleString('en-US', { timeZone: 'America/New_York' });
          incidentCounters.videoBox2++;
          updateLocalStorage();
          sendDataToServer('report', 2, date, 'NA', 'NA' );
        }
      
        if (data.box) {
            startFlashing(data.box);
        }
    }

    if (event.data instanceof ArrayBuffer) {
        // Decode the ArrayBuffer to identify the source
        const view = new DataView(event.data);
        const boxId = view.getUint8(0) === 1 ? 'videoBox1' : 'videoBox2'; // 1 for videoBox1, 2 for videoBox2
        const frameData = event.data.slice(1); // Remove the first byte (identifier)

        frameQueues[boxId].push(frameData);
        if (!isPlaying[boxId]) {
            isPlaying[boxId] = true;
            playNextFrame(boxId, `${boxId}Video`);
        }
    }
});

// Function to start flashing effect for alerts
function startFlashing(boxId) {
    const box = document.getElementById(boxId);
    if (box) {
        box.classList.add('flashing');
    }
}

// Function to stop flashing effect for resolved alerts, and send info to server for report update 
function resolveAlert(boxId) {
    let date;
    const box = document.getElementById(boxId);
    if (box) {
        box.classList.remove('flashing');
    }
  
    // Record the resolution time and calculate the duration of the incident and send to server
    const resolutionTime = new Date();
    let totalDuration;
  
    if (boxId === 'videoBox1') {
      totalDuration = (resolutionTime - incidentTimes.videoBox1)/1000;
      date = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
      sendDataToServer('resolved', 1, date, totalDuration, incidentCounters.videoBox1 );
      CAM1active = false;
        
    } else if (boxId === 'videoBox2') {
      totalDuration = (resolutionTime - incidentTimes.videoBox2)/1000;
      date = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
      sendDataToServer('resolved', 2, date, totalDuration, incidentCounters.videoBox2 );  
      CAM2active = false;
    } 
}

//send report/resolved data to server for processing
const sendDataToServer = async (action, cam, time, duration, counter) => {
    try {
        const response = await fetch('/incident', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                cam: cam,
                time: time,
                duration: duration,
                counter: counter
            })
        });

        const result = await response.json();
        console.log('Server response:', result);
    } catch (error) {
        console.error('Error sending data to server:', error);
    }
};

//trigger backend refresh so that txt files reflect recent changes
function triggerRefresh() {
    fetch('/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
    })
    .catch(error => {
        console.error('Error triggering refresh:', error);
    });
}
//reset incident counters and clear report/incident files
function resetSite() {
	localStorage.setItem('incidentCounterVideoBox1', 0);
	localStorage.setItem('incidentCounterVideoBox2', 0);
    
	fetch('/reset', {
    	method: 'POST',
    	headers: {
        	'Content-Type': 'application/json',
    	},
	})
	.then(response => response.json())
	.then(data => {
    	console.log(data.message);
      window.location.reload();
	})
	.catch(error => {
    	console.error('Error triggering reset:', error);
	});
 
}
//open respective report in new tab
function openFile(fileName) { 
    const fileURL = fileName;
    window.open(fileURL, '_blank'); 
}
