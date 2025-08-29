const express = require('express');
const path = require('path');
const http = require('http');
const {Server} = require('socket.io');
const session = require('express-session');
const FileStore = require("session-file-store")(session);

const app = express();
const PORT = process.env.PORT || 3000;

const sessionMiddleware = session({
    store: new FileStore({
        path: path.join(__dirname, "sessions")
    }),
    secret: '3de69412-95d9-4421-91dd-f40b49a4c362',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: false} // true if HTTPS
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(sessionMiddleware);

const server = http.createServer(app);
const io = new Server(server);

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

const db = new Map();

io.on('connection', (socket) => {
    console.log(`Socket connected`, socket.request.session);
    socket.emit("sessionData", socket.request.session);
    if (socket.request.session.teamId) {
        socket.join(socket.request.session.teamId);
        socket.emit('votes-update', db.get(socket.request.session.teamId));
    }
    socket.on('join-team', (data) => {
        console.log(`${data.username} (${data.isAdmin ? "Admin" : "User"}) from ${data.teamId} connected`);
        socket.request.session.username = data.username;
        socket.request.session.teamId = `${data.teamId}`;
        socket.request.session.isAdmin = data.isAdmin;
        socket.request.session.save(err => {
            if (err) console.log(err);
        });
        if (socket.request.session.isAdmin) {
            db.set(socket.request.session.teamId, []);
        }
        socket.join(socket.request.session.teamId);
        socket.emit('votes-update', db.get(socket.request.session.teamId));
    });

    socket.on('vote', (value) => {
        if (socket.request.session.username) {
            db.get(socket.request.session.teamId).find(story => story.isCurrent)
                .votes[socket.request.session.username] = +value;
            io.to(socket.request.session.teamId).emit('votes-update', db.get(socket.request.session.teamId));
        } else {
            console.error(`User is not logged in`);
        }
    });

    socket.on('addStory', (storyTitle) => {
        if (socket.request.session.isAdmin) {
            db.get(socket.request.session.teamId).push({
                title: storyTitle,
                votes: {},
                isCurrent: true,
                average: undefined,
                final: undefined
            });
            io.to(socket.request.session.teamId).emit('storyAdded', db.get(socket.request.session.teamId));
        }
    });

    socket.on('logout', () => {
        if (socket.request.session.isAdmin) {
            db.delete(socket.request.session.teamId);
            io.to(socket.request.session.teamId).emit('logout', {});
        }
        delete socket.request.session.username;
        delete socket.request.session.teamId;
        delete socket.request.session.isAdmin;
        socket.request.session.save(err => {
            if (err) console.log(err);
        });
        socket.emit('refresh', {});
    });

    socket.on('disconnect', () => {
        console.log(`${socket.request.session.username} (${socket.request.session.isAdmin ? "Admin" : "User"}) from ${socket.request.session.teamId} disconnected!`);
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
