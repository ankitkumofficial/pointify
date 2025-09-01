import express from 'express';
import path from 'path';
import http from 'http';
import {Server} from 'socket.io';
import session from 'express-session';
import FileStorePkg from 'session-file-store';
import {fileURLToPath} from 'url';
import {dirname} from 'path';
import {readDb, saveDb, teamIdNotExists, usernameNotAvailable} from "./util.js";

const FileStore = FileStorePkg(session);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const appData = new Map(Object.entries(readDb()));

io.on('connection', (socket) => {
    console.log(`Socket connected`, socket.request.session);
    socket.emit("sessionData", socket.request.session);
    if (socket.request.session.teamId) {
        socket.join(socket.request.session.teamId);
        socket.emit('votes-update', appData.get(socket.request.session.teamId));
    }
    socket.on('join-team', (userData) => {
        console.log(`${userData.username} (${userData.isAdmin ? "Admin" : "User"}) from ${userData.teamId} connected`);
        if (teamIdNotExists(appData, userData)) {
            socket.emit('alert', "Team Id does not exist.");
            return;
        }
        if (usernameNotAvailable(appData, userData)) {
            socket.emit('alert', "Username is not available.");
            return;
        }
        socket.request.session.username = userData.username;
        socket.request.session.teamId = `${userData.teamId}`;
        socket.request.session.isAdmin = userData.isAdmin;
        socket.request.session.save(err => {
            if (err) console.log(err);
        });
        if (socket.request.session.isAdmin) {
            appData.set(socket.request.session.teamId, []);
            saveDb(appData);
        }
        socket.join(socket.request.session.teamId);
        socket.emit("sessionData", socket.request.session);
        socket.emit('votes-update', appData.get(socket.request.session.teamId));
    });

    socket.on('vote', (value) => {
        if (socket.request.session.username) {
            appData.get(socket.request.session.teamId).find(story => story.isCurrent)
                .votes[socket.request.session.username] = +value;
            saveDb(appData);
            io.to(socket.request.session.teamId).emit('votes-update', appData.get(socket.request.session.teamId));
        } else {
            console.error(`User is not logged in`);
        }
    });

    socket.on('addStory', (storyTitle) => {
        if (socket.request.session.isAdmin) {
            appData.get(socket.request.session.teamId).push({
                title: storyTitle,
                votes: {},
                isCurrent: true,
                average: undefined,
                final: undefined
            });
            saveDb(appData);
            io.to(socket.request.session.teamId).emit('storyAdded', appData.get(socket.request.session.teamId));
        }
    });

    socket.on('logout', () => {
        if (socket.request.session.isAdmin) {
            appData.delete(socket.request.session.teamId);
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
