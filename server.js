const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",  // En producción, cambia esto a tu dominio específico
        methods: ["GET", "POST"]
    }
});

// Almacena las conexiones activas
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Manejar unión a una sala
    socket.on('join', (roomId) => {
        console.log(`Usuario ${socket.id} intentando unirse a la sala ${roomId}`);
        
        // Unir al socket a la sala
        socket.join(roomId);
        
        // Almacenar información de la sala
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set([socket.id]));
        } else {
            rooms.get(roomId).add(socket.id);
        }

        // Notificar a otros en la sala
        const usersInRoom = rooms.get(roomId).size;
        console.log(`Usuarios en la sala ${roomId}:`, usersInRoom);

        // Si hay exactamente 2 personas, iniciar la conexión
        if (usersInRoom === 2) {
            socket.to(roomId).emit('ready');
        }
    });

    // Manejar oferta WebRTC
    socket.on('offer', ({ roomId, offer }) => {
        console.log('Retransmitiendo oferta');
        socket.to(roomId).emit('offer', offer);
    });

    // Manejar respuesta WebRTC
    socket.on('answer', ({ roomId, answer }) => {
        console.log('Retransmitiendo respuesta');
        socket.to(roomId).emit('answer', answer);
    });

    // Manejar candidatos ICE
    socket.on('ice-candidate', ({ roomId, candidate }) => {
        console.log('Retransmitiendo candidato ICE');
        socket.to(roomId).emit('ice-candidate', candidate);
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        
        // Eliminar usuario de todas las salas
        rooms.forEach((users, roomId) => {
            if (users.has(socket.id)) {
                users.delete(socket.id);
                if (users.size === 0) {
                    rooms.delete(roomId);
                }
                // Notificar a otros en la sala
                socket.to(roomId).emit('user-disconnected', socket.id);
            }
        });
    });
});

// Servir archivos estáticos (opcional)
app.use(express.static('public'));

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});