import express from 'express';
import path from 'path';
import http from 'http';
import {Server} from 'socket.io';
import session from 'express-session';
import FileStorePkg from 'session-file-store';
import {fileURLToPath} from 'url';
import {dirname} from 'path';
import {
    addUser,
    initUser,
    removeSession,
    readDb,
    removeUser,
    removeUserByTeamIdAndUsername,
    saveDb,
    usernameExists
} from "./util.js";

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
    if (socket.request.session.teamId && appData.get(socket.request.session.teamId)) {
        console.log(`${socket.request.session.username} from ${socket.request.session.teamId} has connected`);
        addUser(socket, appData);
        io.to(socket.request.session.teamId).emit('users-update', appData.get(socket.request.session.teamId)?.users);
        initUser(socket, appData);
    }
    socket.on('join-team', (userData) => {
        if (userData.isAdmin) {
            const MAX_ATTEMPTS = 10;
            let attempt = 0;
            let teamId;
            for (attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                teamId = Math.floor(1 + Math.random() * 9);
                if (!appData.get(`${teamId}`)) {
                    break;
                }
            }
            if (attempt >= MAX_ATTEMPTS) {
                socket.emit('alert', "Unable to generate new team Ids.");
                return;
            }
            userData.teamId = teamId;
        } else {
            if (!appData.get(`${userData.teamId}`)) {
                socket.emit('alert', "Team Id does not exist.");
                return;
            }
            if (usernameExists(appData, userData)) {
                socket.emit('alert', "Username is not available.");
                return;
            }
        }
        socket.request.session.username = userData.username;
        socket.request.session.teamId = `${userData.teamId}`;
        socket.request.session.isAdmin = userData.isAdmin;
        socket.request.session.save(err => {
            if (err) {
                console.log('Error in saving session', err);
            }
        });
        if (socket.request.session.isAdmin) {
            appData.set(socket.request.session.teamId, {users: [], stories: []});
        }
        addUser(socket, appData);
        io.to(socket.request.session.teamId).emit('users-update', appData.get(socket.request.session.teamId)?.users);
        console.log(`${userData.username} has joined ${userData.teamId}`);
        initUser(socket, appData);
        if (socket.request.session.isAdmin) {
            saveDb(appData);
        }
    });

    socket.on('vote', (value) => {
        if (!socket.request.session.username) {
            socket.emit('alert', 'User is not logged in');
            return;
        }
        appData.get(socket.request.session.teamId).stories.find(story => story.isCurrent)
            .votes[socket.request.session.username] = +value;
        io.to(socket.request.session.teamId).emit('votes-update', appData.get(socket.request.session.teamId).stories);
        saveDb(appData);
    });

    socket.on('addStory', (storyTitle) => {
        if (socket.request.session.isAdmin) {
            appData.get(socket.request.session.teamId).stories.push({
                title: storyTitle,
                votes: {},
                isCurrent: true,
                average: undefined,
                final: undefined
            });
            io.to(socket.request.session.teamId).emit('storyAdded', appData.get(socket.request.session.teamId).stories);
            saveDb(appData);
        }
    });

    socket.on('removeUser', (username) => {
        const teamId = socket.request.session.teamId;
        if (socket.request.session.isAdmin && teamId) {
            removeUserByTeamIdAndUsername(teamId, username, appData);
            io.in(teamId).fetchSockets().then((sockets) => {
                sockets.forEach(socketObj => {
                    if (socketObj.request.session.username === username) {
                        removeSession(socketObj);
                    }
                });
            });
            console.log(`${username} has been removed by admin`);
            io.to(teamId).emit('users-update', appData.get(teamId).users);
        }
    });

    socket.on('logout', () => {
        if (!socket.request.session.username) {
            socket.emit('alert', 'User is not logged in');
            return;
        }
        console.log(`${socket.request.session.username} from ${socket.request.session.teamId} has logged out`);
        if (socket.request.session.isAdmin) {
            appData.delete(socket.request.session.teamId);
            io.to(socket.request.session.teamId).emit('logout');
        } else {
            removeUser(socket, appData);
        }
        const teamId = socket.request.session.teamId;
        const isAdmin = socket.request.session.isAdmin;
        removeSession(socket);
        io.to(teamId).emit('users-update', appData.get(teamId)?.users);
        if (isAdmin) {
            saveDb(appData);
        }
    });

    socket.on('disconnect', () => {
        if (socket.request.session.username) {
            console.log(`${socket.request.session.username} from ${socket.request.session.teamId} has disconnected`);
            removeUser(socket, appData);
            io.to(socket.request.session.teamId).emit('users-update', appData.get(socket.request.session.teamId)?.users);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
