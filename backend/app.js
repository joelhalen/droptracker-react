require('dotenv').config();
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const https = require('https'); // Add https
const { restrictToLocalhost } = require('./utils/middleware');
const publicRoutes = require('./public/publicRoutes');
const clanRoutes = require('./public/clanRoutes');
const userRoutes = require('./public/userRoutes');
const discordRoutes = require('./utils/DiscordOAuth');
const apiRoutes = require('./public/apiRoutes');
const clientRoutes = require('./public/clientRoutes');
const { initializeWebSocket } = require('./utils/websocket');
const { client, connectRedis, initializeCache, initializeRecentDropsCache } = require('./redis/redisClient');
const { GetAllClansAndCache } = require("./utils/rankAllLoot");

const app = express();

app.use((req, res, next) => {
    // console.log('Request Origin:', req.headers.origin); // Log the origin of incoming requests
    next();
});
const allowedOrigins = [
    'https://droptracker.io',
    'http://droptracker.io',
    'https://www.droptracker.io',
    'http://localhost:21222',
    'http://localhost',
    'http://www.droptracker.io/',
    'https://www.droptracker.io/',
    'https://api.droptracker.io/'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.urlencoded({ extended: true }));


const httpsOptions = {
    key: fs.readFileSync('C:/xampp/apache/conf/ssl/private.key'), // Update paths as per your setup
    cert: fs.readFileSync('C:/xampp/apache/conf/ssl/certificate.crt')
};

app.use(bodyParser.json());
console.log('Initializing middlewares...');

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

console.log('Setting up routes...');
app.use('/', publicRoutes);
console.log('Public routes initialized.');
app.use('/', discordRoutes);
console.log('Discord routes initialized.');

app.use('/api', apiRoutes);
console.log('API routes initialized.');
app.use('/api/client', clientRoutes);

app.use('/clan', clanRoutes);
console.log('Clan routes initialized.');
app.use('/player', userRoutes);
console.log('Player routes initialized.');

app.use('/private', restrictToLocalhost);
console.log('Private routes initialized.');
app.get('/test', (req, res) => {
    res.send('Test route is working!');
});

// Ensure environment variable for port is set
const PORT = process.env.BACKEND_LISTEN_PORT || 21220;
console.log(`Port set to: ${PORT}`);

const startServer = async () => {
    await connectRedis(); // Connect to Redis before starting the server

    // Create HTTPS server
    const server = https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`HTTPS Server running on https://localhost:${PORT}`);
    });

    initializeWebSocket(server);
    console.log('WebSocket initialized.');
    await GetAllClansAndCache();
    console.log("Cached clan members & started loop")
    await initializeCache();
    await initializeRecentDropsCache();
    console.log("Initialized caches")
};

startServer();
