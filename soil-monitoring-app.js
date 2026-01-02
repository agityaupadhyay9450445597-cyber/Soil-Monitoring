const { SerialPort, ReadlineParser } = require('serialport');
const http = require('http');
const fs = require('fs');
const socketIo = require('socket.io');

// Create HTTP server
const server = http.createServer((req, res) => {
    fs.readFile('soil-monitoring.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading soil-monitoring.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

// Attach Socket.io to server
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Setup SerialPort and parser (with error handling)
let port = null;
let parser = null;

// Try to connect to Arduino, but don't crash if not available
try {
    port = new SerialPort({
        path: 'COM5',  // Change this to match your Arduino's port
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        flowControl: false
    });
    
    parser = new ReadlineParser({ delimiter: '\r\n' });
    port.pipe(parser);
    console.log('✅ Arduino connected on COM5');
} catch (error) {
    console.log('⚠️  Arduino not connected - running in demo mode');
    console.log('   Connect Arduino to COM5 and restart to use real sensors');
}

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('🌐 A client connected');
    
    socket.on('disconnect', () => {
        console.log('🔌 A client disconnected');
    });
});

// Store sensor data until we have all three values
let sensorData = {
    temperature: null,
    humidity: null,
    soilMoisture: null
};

// Demo mode - generate fake data if no Arduino
let demoMode = !port;
if (demoMode) {
    console.log('🎬 Starting demo mode with simulated sensor data');
    
    // Generate demo data every 3 seconds
    setInterval(() => {
        const demoData = {
            temperature: (20 + Math.random() * 15).toFixed(1), // 20-35°C
            humidity: (40 + Math.random() * 40).toFixed(1),    // 40-80%
            soilMoisture: Math.floor(30 + Math.random() * 50)  // 30-80%
        };
        
        console.log('🎬 Demo data:', demoData);
        io.emit('sensorData', demoData);
    }, 3000);
}

// Real Arduino data processing
if (parser) {
    parser.on('data', (data) => {
        console.log('📊 Received data:', data);
        
        // Parse individual sensor readings
        let tempMatch = data.match(/Temperature:\s*([\d.]+)\s*°C/);
        let humMatch = data.match(/Humidity:\s*([\d.]+)\s*%/);
        let soilMatch = data.match(/Soil Moisture:\s*(\d+)\s*%/);
        
        // Update our sensorData object with any new values
        if (tempMatch) {
            sensorData.temperature = parseFloat(tempMatch[1]);
        }
        if (humMatch) {
            sensorData.humidity = parseFloat(humMatch[1]);
        }
        if (soilMatch) {
            sensorData.soilMoisture = parseInt(soilMatch[1], 10);
        }
        
        // If we have all three values, emit the data
        if (sensorData.temperature !== null && 
            sensorData.humidity !== null && 
            sensorData.soilMoisture !== null) {
            
            console.log('🚀 Sending real data to clients:', sensorData);
            io.emit('sensorData', sensorData);
        }
    });
}

// Handle serial port errors
if (port) {
    port.on('error', (err) => {
        console.error('❌ Serial Port Error:', err.message);
        console.log('💡 Tip: Check if Arduino is connected and COM port is correct');
    });
}

// Start server on port 3000
server.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
});