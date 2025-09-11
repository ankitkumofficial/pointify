import {handleAdminCheckBox} from "./util.js";

const socket = io();
let session;
socket.on('alert', (msg) => {
    alert(msg);
    location.reload();
});
socket.on("sessionData", (sessionData) => {
    session = sessionData;
    initPage();
});
socket.on("init", () => initPage());
socket.on('refresh', () => location.reload());
socket.on('logout', () => {
    if (!session.isAdmin) {
        document.getElementById('logoutBtn').click();
    }
});
socket.on('users-update', (users) => {
    if (users && users.length > 0) {
        document.getElementById('usersContainer').style.display = '';
        const ulUsers = document.getElementById('users');
        ulUsers.innerHTML = '';
        for (let i in users) {
            const li = document.createElement('li');
            li.style.setProperty("--bullet-color", "green");
            li.style.setProperty("--bullet-size", "1.25em");
            li.appendChild(document.createTextNode(`${users[i]} is online`));
            if (session.isAdmin && session.username !== users[i]) {
                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.addEventListener('click', () => socket.emit('removeUser', users[i]));
                removeButton.style.marginLeft = '1em';
                li.appendChild(removeButton);
            }
            ulUsers.appendChild(li);
        }
    }
});
socket.on('votes-update', (stories) => {
    document.getElementById('estimatedContainer').style.display = '';
    const estimatedStories = stories?.filter(story => !story.isCurrent);
    if (estimatedStories && estimatedStories.length > 0) {
        document.getElementById('estimatedStories').textContent = '';
        let story;
        for (let i = estimatedStories.length - 1; i >= 0; i--) {
            story = estimatedStories[i];
            document.getElementById('estimatedStories').append(`Story: ${story.title}`);
            document.getElementById('estimatedStories').innerHTML += '<br>';
            document.getElementById('estimatedStories').append('Votes: ');
            document.getElementById('estimatedStories').append(Object.keys(story.votes)
                .map(username => `${username}: ${story.votes[username]}`)
                .join(', '));
            document.getElementById('estimatedStories').innerHTML += '<br>';
            document.getElementById('estimatedStories').append(`Average: ${story.average}, Suggested: ${story.suggested}`);
            document.getElementById('estimatedStories').innerHTML += '<br>';
            if (i > 0) {
                document.getElementById('estimatedStories').innerHTML +=
                    '<hr style="border:0;height:1px;background:currentColor;opacity:.2;margin: 0.25em 0">';
            }
        }
    } else {
        document.getElementById('estimatedStories').textContent = 'N/A';
    }
    const currentStory = stories?.find(story => story.isCurrent);
    if (currentStory) {
        if (!session.isAdmin) {
            document.getElementById('finishEstimationContainer').style.display = 'none';
        }
        document.getElementById('estimationContainer').style.display = '';
        document.getElementById('currentStoryTitle').innerText = currentStory.title;
        const ulVotes = document.getElementById('votes');
        ulVotes.style.listStyle = 'none';
        ulVotes.innerHTML = '';
        for (let username in currentStory.votes) {
            const li = document.createElement('li');
            li.appendChild(document.createTextNode(`✅ ${username} has voted `));
            if (session.isAdmin && session.username !== username) {
                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.addEventListener('click', () => socket.emit('removeVote', username));
                removeButton.style.marginLeft = '1em';
                li.appendChild(removeButton);
            }
            ulVotes.appendChild(li);
        }
        if (Object.keys(currentStory.votes).length === 0) {
            const li = document.createElement('li');
            li.appendChild(document.createTextNode(`⏳ Waiting for votes`));
            ulVotes.appendChild(li);
            document.getElementById('estimationContainer').style.display = '';
        }
        if (session.isAdmin) {
            document.getElementById('estimationForm').style.display = 'none';
        }
    } else {
        // reset before hiding
        const ulVotes = document.getElementById('votes');
        ulVotes.style.listStyle = 'none';
        ulVotes.innerHTML = '';
        const li = document.createElement('li');
        li.appendChild(document.createTextNode(`⏳ Waiting for votes`));
        ulVotes.appendChild(li);
        document.getElementById('estimationContainer').style.display = 'none';
    }
});
socket.on('storyAdded', (stories) => {
    if (!session.isAdmin) {
        document.getElementById('finishEstimationContainer').style.display = 'none';
    }
    document.getElementById('estimationContainer').style.display = '';
    const currentStory = stories.find(story => story.isCurrent);
    document.getElementById('currentStoryTitle').innerText = currentStory.title;
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    socket.emit('logout');
});

handleAdminCheckBox();

document.getElementById('isAdminInput').addEventListener('change', () => handleAdminCheckBox());

document.getElementById('submitBtn').addEventListener('click', () => {
    const username = document.getElementById('nameInput').value;
    let teamId;
    if (!username) {
        alert('Please input your name');
        return;
    }
    const isAdmin = document.getElementById('isAdminInput').checked;
    if (isAdmin) {
        document.getElementById('adminInfo').style.display = "block";
        document.getElementById('adminInfo').innerHTML = `<br>Your colleagues can join with team id: ${teamId}`;
    } else {
        teamId = document.getElementById('teamIdInput').value;
        if (!teamId) {
            alert('Please input your teamId');
            return;
        }
    }
    socket.emit('join-team', {teamId, username, isAdmin});
});

document.getElementById('startEstimationBtn').addEventListener('click', () => {
    const storyTitle = document.getElementById('storyTitleInput').value;
    if (!storyTitle) {
        alert('Please provide story title');
        return;
    }
    socket.emit('addStory', storyTitle);
    document.getElementById('estimationForm').style.display = 'none';
});

document.getElementById('finishEstimationBtn').addEventListener('click', () => {
    socket.emit('finishEstimation');
});

export const sendVote = (value) => {
    socket.emit('vote', value);
};
window.sendVote = sendVote;

export const initPage = () => {
    if (session.username) {
        document.getElementById("preLogin").style.display = 'none';
        document.getElementById('logoutBtn').style.display = '';
        if (session.isAdmin) {
            document.getElementById('adminInfo').style.display = "block";
            document.getElementById('adminInfo').innerHTML = `<br>Your colleagues can join with team id: ${session.teamId}`;
            document.getElementById('estimationForm').style.display = '';
            document.getElementById('storyTitleInput').value = '';
            document.getElementById('logoutBtn').innerText = 'Delete Team and Logout';
        }
    } else {
        document.getElementById("logoutBtn").style.display = 'none';
    }
}
