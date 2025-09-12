import express from 'express';
import path from 'path';
import http from 'http';
import {Server} from 'socket.io';
import session from 'express-session';
import FileStorePkg from 'session-file-store';
import {fileURLToPath} from 'url';
import {
    addUserInCache,
    initUser,
    removeSession,
    readDb,
    removeUser,
    removeUserByTeamIdAndUsername,
    saveDb,
    usernameExists, storiesWithHiddenVotesInCurrent, nearestFibonacci, getValidationError
} from "./util.js";

const FileStore = FileStorePkg(session);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server);

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

const usersCache = {};

io.on('connection', (socket) => {
    const session = socket.request.session;
    if (session.teamId && session.username) {
        const teamData = readDb()[session.teamId];
        if (teamData) {
            console.log(`${session.username} from ${session.teamId} has connected`);
            addUserInCache(session, usersCache);
            io.to(session.teamId).emit('users-update', usersCache[session.teamId]);
            initUser(socket, teamData, usersCache);
        }
    }

    socket.on('join-team', (userData) => {
        const validationError = getValidationError(userData);
        if (validationError) {
            socket.emit('alert', validationError);
            return;
        }
        const session = socket.request.session;
        if (userData.isAdmin) {
            const MAX_ATTEMPTS = 10;
            let attempt;
            let teamId;
            const existingTeamIds = Object.keys(readDb());
            for (attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                teamId = Math.floor(100 + Math.random() * 900);
                if (!existingTeamIds.includes(`${teamId}`)) {
                    break;
                }
            }
            if (attempt >= MAX_ATTEMPTS) {
                socket.emit('alert', "Unable to generate new team Ids.");
                return;
            }
            userData.teamId = teamId;
        }
        let teamData = readDb()[`${userData.teamId}`];
        if (!userData.isAdmin && !teamData) {
            socket.emit('alert', "Team Id does not exist.");
            return;
        }
        if (!userData.isAdmin && usernameExists(userData, usersCache)) {
            socket.emit('alert', "Username is not available.");
            return;
        }
        session.username = userData.username;
        session.teamId = `${userData.teamId}`;
        session.isAdmin = userData.isAdmin;
        session.save(err => {
            if (err) console.log(err);
            if (socket.request.session.isAdmin) {
                teamData = {stories: []};
            }
            addUserInCache(session, usersCache);
            io.to(session.teamId).emit('users-update', usersCache[session.teamId]);
            console.log(`${userData.username} has joined ${userData.teamId}`);
            initUser(socket, teamData, usersCache);
            if (session.isAdmin) {
                teamData.createdAt = Date.now();
                saveDb(db => db[session.teamId] = teamData);
            }
        });
    });

    socket.on('vote', (value) => {
        const session = socket.request.session;
        if (!session.username) {
            socket.emit('alert', 'User is not logged in');
            return;
        }
        const teamData = readDb()[session.teamId];
        teamData.stories.find(story => story.isCurrent)
            .votes[session.username] = value && !isNaN(value) ? +value : null;
        io.to(session.teamId).emit('votes-update', storiesWithHiddenVotesInCurrent(session.teamId, teamData));
        saveDb(db => db[session.teamId] = teamData);
    });

    socket.on('addStory', (storyTitle) => {
        const session = socket.request.session;
        const teamData = readDb()[session.teamId];
        if (session.isAdmin) {
            teamData.stories.push({
                title: storyTitle,
                votes: {},
                isCurrent: true,
                average: undefined,
                final: undefined
            });
            io.to(session.teamId).emit('storyAdded', teamData.stories);
            saveDb(db => db[session.teamId] = teamData);
        }
    });

    socket.on('removeUser', (username) => {
        const session = socket.request.session;
        const teamId = session.teamId;
        if (session.isAdmin && teamId) {
            removeUserByTeamIdAndUsername(teamId, username, usersCache);
            io.in(teamId).fetchSockets().then((sockets) => {
                sockets.forEach(socketObj => {
                    if (socketObj.request.session.username === username) {
                        removeSession(socketObj);
                    }
                });
            });
            console.log(`${username} has been removed by admin`);
            io.to(teamId).emit('users-update', usersCache[session.teamId]);
        }
    });

    socket.on('removeVote', (username) => {
        const session = socket.request.session;
        if (session.teamId && session.isAdmin) {
            const teamData = readDb()[session.teamId];
            delete teamData.stories.find(story => story.isCurrent)?.votes[username];
            saveDb(db => db[session.teamId] = teamData);
            console.log(`${username}'s vote has been removed by admin`);
            io.to(session.teamId).emit('votes-update', storiesWithHiddenVotesInCurrent(session.teamId, teamData));
        }
    });

    socket.on('finishEstimation', () => {
        const session = socket.request.session;
        const teamData = readDb()[session.teamId];
        if (session.teamId && session.isAdmin && teamData.stories.length > 0) {
            const currentStory = teamData.stories.find(story => story.isCurrent);
            const votes = Object.values(currentStory.votes).filter(vote => vote);
            const average = votes.length > 0 ? +(votes.reduce((acc, value) => acc + value, 0) / votes.length).toFixed(2) : null;
            const suggested = nearestFibonacci(average);
            currentStory.average = average;
            currentStory.suggested = suggested;
            currentStory.isCurrent = false;
            io.to(session.teamId).emit('votes-update', storiesWithHiddenVotesInCurrent(session.teamId, teamData));
            io.to(session.teamId).emit('init');
            saveDb(db => db[session.teamId] = teamData);
        }
    });

    socket.on('logout', () => {
        const session = socket.request.session;
        if (!session.username) {
            socket.emit('alert', 'User is not logged in');
            return;
        }
        console.log(`${session.username} from ${session.teamId} has logged out`);
        if (session.isAdmin) {
            const teamId = session.teamId;
            saveDb(db => delete db[teamId]); // callback function requires constant teamId
            io.to(socket.request.session.teamId).emit('logout');
        } else {
            removeUser(session, usersCache);
            io.to(session.teamId).emit('users-update', usersCache[session.teamId]);
        }
        removeSession(socket);
    });

    socket.on('disconnect', () => {
        const session = socket.request.session;
        if (session.username || session.teamId) {
            console.log(`${session.username} from ${session.teamId} has disconnected`);
            removeUser(session, usersCache);
            io.to(session.teamId).emit('users-update', usersCache[session.teamId]);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
