// app.js
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import supabase from './supabaseCliente.js';
import formRoutes from './routes/formRoutes.js';
import { WebSocketServer } from 'ws'; // Importamos WebSocketServer

dotenv.config();

const app = express();

// Configurar CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    req.supabase = supabase;
    next();
});

app.use('/api', formRoutes);

app.get('/', (req, res) => {
    res.status(200).json({ message: 'El ternero se crió correctamente' });
});

const PORT = process.env.PORT || 3000;
// Creamos el servidor HTTP y lo almacenamos en una constante
const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

// Configuración del servidor WebSocket
const wss = new WebSocketServer({ noServer: true });

// Almacenamos la instancia en un objeto global para usarla en los controladores
global.wss = wss;

// Manejamos las conexiones WebSocket
wss.on('connection', ws => {
    console.log('Cliente WebSocket conectado');
    ws.on('message', message => {
        console.log(`Mensaje recibido: ${message}`);
    });
    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado');
    });
    ws.on('error', error => {
        console.error('Error en WebSocket:', error);
    });
});

// Hacemos que el servidor de Express maneje las actualizaciones WebSocket
server.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws') {
        wss.handleUpgrade(request, socket, head, ws => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});