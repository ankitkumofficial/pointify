export const handleAdminCheckBox = () => {
    const isChecked = document.getElementById('isAdminInput').checked;
    document.getElementById('teamIdField').style.display = isChecked ? 'none' : 'block';
    document.getElementById('submitBtn').innerHTML = isChecked ? 'Create Team' : 'Join';
};

export const showPopup = (message, actions) => {
    document.getElementById("popupMessage").innerText = message;
    const popupOverlay = document.getElementById("popupOverlay");
    popupOverlay.style.display = "flex";
    const closeBtn = document.getElementById("closePopupBtn");
    const yesBtn = document.getElementById("yesPopupBtn");
    const noBtn = document.getElementById("noPopupBtn");
    closeBtn.style.display = "none";
    yesBtn.style.display = "none";
    noBtn.style.display = "none";
    if (actions) {
        if (actions.onClose && typeof actions.onClose === "function") {
            closeBtn.style.display = "inline-block";
            closeBtn.onclick = () => {
                popupOverlay.style.display = "none";
                actions.onClose();
            };
        }
        if (actions.onYes && typeof actions.onYes === "function") {
            yesBtn.style.display = "inline-block";
            yesBtn.onclick = () => {
                popupOverlay.style.display = "none";
                actions.onYes();
            };
        }
        if (actions.onNo && typeof actions.onNo === "function") {
            noBtn.style.display = "inline-block";
            noBtn.onclick = () => {
                popupOverlay.style.display = "none";
                actions.onNo();
            };
        }
    } else {
        closeBtn.style.display = "inline-block";
        closeBtn.onclick = () => popupOverlay.style.display = "none";
    }
};
window.showPopup = showPopup;

export const clearVoteButtons = () => {
    let voteButtons = document.getElementById('voteButtons');
    voteButtons = voteButtons.querySelectorAll('button');
    voteButtons.forEach(btn => {
        if (btn.classList.contains('selected')) {
            btn.classList.remove('selected');
            const clonedBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(clonedBtn, btn);
        }
    });
    return voteButtons;
}
