export const handleAdminCheckBox = () => {
    const isChecked = document.getElementById('isAdminInput').checked;
    document.getElementById('teamIdField').style.display = isChecked ? 'none' : 'block';
    document.getElementById('submitBtn').innerHTML = isChecked ? 'Create Team' : 'Join';
};

export const showPopup = (message, callback) => {
    document.getElementById("popupMessage").innerText = message;
    document.getElementById("popupOverlay").style.display = "flex";
    document.getElementById("closePopupBtn").onclick = () => {
        document.getElementById("popupOverlay").style.display = "none";
        if (typeof callback === "function") {
            callback();
        }
    };
};
window.showPopup = showPopup;

export const clearVoteButtons = () => {
    let voteButtons = document.getElementById('voteButtons');
    voteButtons = voteButtons.querySelectorAll('button');
    voteButtons.forEach(btn => btn.classList.remove('selected'));
    return voteButtons;
}
