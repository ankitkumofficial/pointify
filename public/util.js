export const handleAdminCheckBox = () => {
    const isChecked = document.getElementById('isAdminInput').checked;
    document.getElementById('teamIdInputDiv').style.display = isChecked ? 'none' : 'block';
    document.getElementById('submitBtn').innerHTML = isChecked ? 'Create and Join' : 'Join';
};
