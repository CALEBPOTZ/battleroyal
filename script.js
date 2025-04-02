// script.js
// --- Connect to Socket.IO Server ---
const socket = io();

// --- Configuration ---
const DEFAULT_PFP = 'https://picsum.photos/seed/default/50';
const PRESET_PFPS = [
    'https://picsum.photos/seed/p1/50', 'https://picsum.photos/seed/p2/50', 'https://picsum.photos/seed/p3/50',
    'https://picsum.photos/seed/p4/50', 'https://picsum.photos/seed/p5/50', 'https://picsum.photos/seed/p6/50',
    'https://picsum.photos/seed/p7/50', 'https://picsum.photos/seed/p8/50', 'https://picsum.photos/seed/p9/50',
    'https://picsum.photos/seed/p10/50'
];
const DEFAULT_BG_COLOR = '#8BC6EC';
const DEFAULT_BG_GRADIENT = 'linear-gradient(135deg, #8BC6EC 0%, #9599E2 100%)';
const DEFAULT_LOGO = 'https://via.placeholder.com/50/FFFFFF/000000?text=★';

// --- DOM Elements ---
const connectionErrorMsg = document.getElementById('connectionErrorMsg');
const usernamePrompt = document.getElementById('usernamePrompt');
const usernameInput = document.getElementById('usernameInput');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');
const registrationErrorMsg = document.getElementById('registrationError');
const mainContent = document.getElementById('mainContent');
const welcomeMessage = document.getElementById('welcomeMessage');
const adminSettingsBtn = document.getElementById('adminSettingsBtn');
const profileSettingsToggle = document.getElementById('profileSettingsToggle');
const copyVsBtn = document.getElementById('copyVsBtn');
const profileSettingsSection = document.getElementById('profileSettingsSection');
const profileUsernameInput = document.getElementById('profileUsername');
const profilePfpUrlInput = document.getElementById('profilePfpUrl');
const profilePfpPreview = document.getElementById('profilePfpPreview');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileUpdateStatus = document.getElementById('profileUpdateStatus');
const pfpPresetContainer = document.getElementById('pfpPresetContainer');
const pfpCustomUrlContainer = document.getElementById('pfpCustomUrlContainer');
const pfpPresetChoiceRadio = document.getElementById('pfpPresetChoice');
const pfpCustomChoiceRadio = document.getElementById('pfpCustomChoice');
const characterNameInput = document.getElementById('characterName');
const submitBtn = document.getElementById('submitBtn');
const choiceErrorMsg = document.getElementById('choiceError');
const resultsTableBody = document.getElementById('resultsTable').querySelector('tbody');
const adminSettingsSection = document.getElementById('adminSettingsSection');
const adminUserListContainer = document.getElementById('adminUserListContainer');
const adminUserMgmtStatus = document.getElementById('adminUserMgmtStatus');
const bgColorInput = document.getElementById('bgColor');
const bgImageInput = document.getElementById('bgImage');
const logoUrlInput = document.getElementById('logoUrl');
const saveAppearanceBtn = document.getElementById('saveAppearanceBtn');
const appearanceStatus = document.getElementById('appearanceStatus');
const appLogo = document.getElementById('appLogo');
const bodyElement = document.body;
const root = document.documentElement;

// --- State ---
let currentUsername = null;
let isAdmin = false;
let currentUserData = {};
let selectedPfpUrl = DEFAULT_PFP;
let currentChoices = {};

// --- Utility Functions ---
function showStatusMessage(element, message, isError = false, duration = 4000) {
    element.textContent = message;
    element.className = 'status-message'; // Reset classes
    element.classList.add(isError ? 'error' : 'success');
    element.classList.remove('hidden');
    if (element.timeoutId) clearTimeout(element.timeoutId);
    if (duration > 0) {
        element.timeoutId = setTimeout(() => element.classList.add('hidden'), duration);
    }
}

function hideStatusMessage(element) {
    element.classList.add('hidden');
    if (element.timeoutId) clearTimeout(element.timeoutId);
}

// --- Core Functions ---
// Updates the MAIN results table display
function updateTable(choices) {
    resultsTableBody.innerHTML = '';
    const usernames = Object.keys(choices);

    if (usernames.length === 0) {
        resultsTableBody.innerHTML = '<tr><td colspan="3">No challengers yet...</td></tr>';
        return;
    }

    usernames.sort().forEach(user => {
        const data = choices[user];
        if (!data) return;

        const row = resultsTableBody.insertRow();

        const pfpCell = row.insertCell();
        pfpCell.classList.add('pfp-col');
        const pfpImg = document.createElement('img');
        pfpImg.src = data.pfpUrl || DEFAULT_PFP;
        pfpImg.alt = `${user} PFP`;
        pfpImg.onerror = function() { this.src = DEFAULT_PFP; };
        pfpCell.appendChild(pfpImg);

        const userCell = row.insertCell();
        userCell.textContent = user;
        if (data.isAdmin) {
            const crown = document.createElement('span');
            crown.className = 'admin-crown'; crown.title = 'Admin'; crown.textContent = '👑';
            userCell.appendChild(crown);
        }

        const wordCell = row.insertCell();
        wordCell.textContent = data.word || '...';
    });
}

// Populates the user list within the ADMIN settings panel
function populateAdminUserList(choices) {
    adminUserListContainer.innerHTML = '';
    hideStatusMessage(adminUserMgmtStatus);
    const usernames = Object.keys(choices);

    if (usernames.length === 0) {
        adminUserListContainer.innerHTML = '<p>No users connected.</p>';
        return;
    }

    usernames.sort().forEach(user => {
        const data = choices[user];
        if (!data) return;

        const userItem = document.createElement('div');
        userItem.className = 'admin-user-item';

        const userInfo = document.createElement('div');
        userInfo.className = 'admin-user-info';
        const userImg = document.createElement('img');
        userImg.src = data.pfpUrl || DEFAULT_PFP;
        userImg.alt = `${user} PFP`;
        userImg.onerror = function() { this.src = DEFAULT_PFP; };
        const userNameSpan = document.createElement('span');
        userNameSpan.textContent = user;
        userInfo.appendChild(userImg);
        userInfo.appendChild(userNameSpan);
        if (data.isAdmin) {
            const crown = document.createElement('span');
            crown.className = 'admin-crown'; crown.title = 'Admin'; crown.textContent = '👑';
            userInfo.appendChild(crown);
        }

        const userActions = document.createElement('div');
        userActions.className = 'admin-user-actions';

        if (isAdmin && user !== currentUsername && !data.isAdmin) {
            const makeAdminBtn = document.createElement('button');
            makeAdminBtn.textContent = 'Make Admin';
            makeAdminBtn.className = 'admin-make-admin-btn';
            makeAdminBtn.dataset.username = user;
            userActions.appendChild(makeAdminBtn);
        }

        if (isAdmin && user !== currentUsername) {
            const removeUserBtn = document.createElement('button');
            removeUserBtn.textContent = 'Remove User';
            removeUserBtn.className = 'admin-remove-user-btn';
            removeUserBtn.dataset.username = user;
            userActions.appendChild(removeUserBtn);
        }

        userItem.appendChild(userInfo);
        if (userActions.hasChildNodes()) {
            userItem.appendChild(userActions);
        }
        adminUserListContainer.appendChild(userItem);
    });
}

// Shows the main app UI after successful login/registration
function showMainAppInterface() {
    console.log("[CLIENT] showMainAppInterface called. Username:", currentUsername, "isAdmin:", isAdmin);
    if (!currentUsername) {
        console.error("[CLIENT] Cannot show main interface without a username!");
        usernamePrompt.classList.remove('hidden');
        mainContent.classList.add('hidden');
        return;
    }
    if (usernamePrompt) usernamePrompt.classList.add('hidden'); else console.error("usernamePrompt element not found");
    if (mainContent) mainContent.classList.remove('hidden'); else console.error("mainContent element not found");
    if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${currentUsername}!`; else console.error("welcomeMessage element not found");

    const showAdminButtons = isAdmin;
    if (adminSettingsBtn) adminSettingsBtn.classList.toggle('hidden', !showAdminButtons); else console.error("adminSettingsBtn element not found");
    if (copyVsBtn) copyVsBtn.classList.toggle('hidden', !showAdminButtons); else console.error("copyVsBtn element not found");

    if (!showAdminButtons && adminSettingsSection) {
        adminSettingsSection.classList.add('hidden');
    }
    if (profileSettingsToggle) profileSettingsToggle.classList.remove('hidden'); else console.error("profileSettingsToggle element not found");
    console.log("[CLIENT] showMainAppInterface finished.");
}

// Registers the username with the server
function registerUsername() {
    // *** ADDED LOG ***
    console.log("[CLIENT] registerUsername function called.");
    const username = usernameInput.value.trim();
    registrationErrorMsg.classList.add('hidden');
    if (username) {
        // *** ADDED LOG ***
        console.log(`[CLIENT] Attempting to register username: ${username}`);
        socket.emit('registerUser', username);
    } else {
        // *** ADDED LOG ***
        console.log("[CLIENT] Registration failed: Username empty.");
        registrationErrorMsg.textContent = 'Please enter a valid username!';
        registrationErrorMsg.classList.remove('hidden');
    }
}

// Submits the character choice
function submitChoice() {
    const word = characterNameInput.value.trim();
    hideStatusMessage(choiceErrorMsg);
    if (!currentUsername) {
        showStatusMessage(choiceErrorMsg, "Please register or wait for connection.", true);
        return;
    }
    if (word) {
        socket.emit('submitChoice', { word: word });
        characterNameInput.value = '';
    } else {
        showStatusMessage(choiceErrorMsg, 'Please enter a character name!', true);
    }
}

// Toggles visibility of a given settings section
function toggleSettingsSection(sectionElement) {
    if (!sectionElement) {
        console.error("Attempted to toggle null section element");
        return;
    }
    if (sectionElement !== profileSettingsSection) profileSettingsSection?.classList.add('hidden');
    if (sectionElement !== adminSettingsSection) adminSettingsSection?.classList.add('hidden');

    sectionElement.classList.toggle('hidden');

    if (sectionElement === adminSettingsSection && !sectionElement.classList.contains('hidden')) {
        populateAdminUserList(currentChoices);
        hideStatusMessage(appearanceStatus); // Hide status on section toggle
    }
    if (sectionElement === profileSettingsSection && !sectionElement.classList.contains('hidden')) {
        hideStatusMessage(profileUpdateStatus); // Hide status on section toggle
    }
}

// Applies the appearance settings globally
function applyAppearanceSettings(settings) {
    console.log("[CLIENT] Applying appearance settings:", settings);
    const bgColor = settings?.bgColor || DEFAULT_BG_COLOR;
    const bgImageUrl = settings?.bgImageUrl || null;
    const logoUrl = settings?.logoUrl || DEFAULT_LOGO;

    if (bgImageUrl) {
        bodyElement.style.backgroundImage = `url('${bgImageUrl}')`;
        bodyElement.style.backgroundColor = ''; // Remove solid color if image exists
    } else {
        // Using a simple solid color fallback for now as gradient logic can be complex
        bodyElement.style.backgroundImage = ''; // Remove potential old image
        bodyElement.style.backgroundColor = bgColor; // Set solid color
    }

    appLogo.src = logoUrl;
    appLogo.onerror = function() { this.src = DEFAULT_LOGO; }; // Fallback for logo

    // Update the input fields in the admin panel if it's open
    if (isAdmin && adminSettingsSection && !adminSettingsSection.classList.contains('hidden')) {
        bgColorInput.value = bgColor;
        bgImageInput.value = bgImageUrl || '';
        logoUrlInput.value = logoUrl || '';
    }
}

// --- Profile Settings Functions ---
function populatePresetPfps() {
    pfpPresetContainer.innerHTML = '';
    PRESET_PFPS.forEach(url => {
        const img = document.createElement('img');
        img.src = url; img.alt = 'Preset PFP'; img.dataset.url = url;
        img.loading = 'lazy';
        img.addEventListener('click', handlePresetPfpClick);
        pfpPresetContainer.appendChild(img);
    });
}

function handlePresetPfpClick(event) {
    selectedPfpUrl = event.target.dataset.url;
    profilePfpPreview.src = selectedPfpUrl;
    profilePfpPreview.onerror = function() { this.src = DEFAULT_PFP; };
    document.querySelectorAll('.pfp-preset-grid img').forEach(img => img.classList.remove('selected'));
    event.target.classList.add('selected');
    pfpPresetChoiceRadio.checked = true;
    pfpCustomUrlContainer.classList.add('hidden');
}

function togglePfpInputMethod() {
    if (pfpCustomChoiceRadio.checked) {
        pfpCustomUrlContainer.classList.remove('hidden');
        document.querySelectorAll('.pfp-preset-grid img').forEach(img => img.classList.remove('selected'));
        updatePfpPreview();
    } else {
        pfpCustomUrlContainer.classList.add('hidden');
        const visuallySelectedPreset = document.querySelector('.pfp-preset-grid img.selected');
        if (visuallySelectedPreset) {
            selectedPfpUrl = visuallySelectedPreset.dataset.url;
        } else {
            const currentIsPreset = PRESET_PFPS.includes(currentUserData?.pfpUrl);
            selectedPfpUrl = currentIsPreset ? currentUserData.pfpUrl : PRESET_PFPS[0];
            document.querySelectorAll('.pfp-preset-grid img').forEach(img => {
                img.classList.toggle('selected', img.dataset.url === selectedPfpUrl);
            });
        }
        profilePfpPreview.src = selectedPfpUrl || DEFAULT_PFP;
        profilePfpPreview.onerror = function() { this.src = DEFAULT_PFP; };
    }
}

function showProfileSettings() {
    if (!currentUsername || !currentUserData) { return; }
    profileUsernameInput.value = currentUsername;
    const currentPfp = currentUserData.pfpUrl || DEFAULT_PFP;
    selectedPfpUrl = currentPfp;
    const isPreset = PRESET_PFPS.includes(currentPfp);
    pfpPresetChoiceRadio.checked = isPreset;
    pfpCustomChoiceRadio.checked = !isPreset;
    document.querySelectorAll('.pfp-preset-grid img').forEach(img => {
        img.classList.toggle('selected', img.dataset.url === currentPfp);
    });
    profilePfpUrlInput.value = isPreset ? '' : currentPfp;
    pfpCustomUrlContainer.classList.toggle('hidden', isPreset);
    profilePfpPreview.src = currentPfp;
    profilePfpPreview.onerror = function() { this.src = DEFAULT_PFP; };
    hideStatusMessage(profileUpdateStatus);
    toggleSettingsSection(profileSettingsSection);
}

function updatePfpPreview() {
    const url = profilePfpUrlInput.value.trim();
    if (pfpCustomChoiceRadio.checked) { selectedPfpUrl = url || DEFAULT_PFP; }
    profilePfpPreview.src = url || DEFAULT_PFP;
    profilePfpPreview.onerror = function() { this.src = DEFAULT_PFP; };
}

function saveProfile() {
    const newUsername = currentUsername;
    let finalPfpUrl;
    if (pfpCustomChoiceRadio.checked) {
        finalPfpUrl = profilePfpUrlInput.value.trim() || DEFAULT_PFP;
    } else {
        const selectedPreset = document.querySelector('.pfp-preset-grid img.selected');
        finalPfpUrl = selectedPreset ? selectedPreset.dataset.url : selectedPfpUrl;
    }
    if (!currentUsername) {
        showStatusMessage(profileUpdateStatus, 'Error: Not logged in.', true); return;
    }
    console.log("[CLIENT] Saving profile:", { newUsername: currentUsername, pfpUrl: finalPfpUrl });
    socket.emit('updateProfile', { newUsername: currentUsername, pfpUrl: finalPfpUrl });
}

// --- Admin Panel Functions ---
function handleAdminUserListClick(event) {
    const target = event.target;
    const targetUsername = target.closest('button')?.dataset.username;

    if (!targetUsername) return;

    if (target.classList.contains('admin-make-admin-btn')) {
        if (confirm(`Are you sure you want to make ${targetUsername} the new admin? You will lose your admin rights.`)) {
            console.log(`[CLIENT] Requesting to make ${targetUsername} admin.`);
            socket.emit('setAdmin', targetUsername);
        }
    } else if (target.classList.contains('admin-remove-user-btn')) {
        if (confirm(`Are you sure you want to REMOVE the user ${targetUsername} completely? This cannot be undone.`)) {
            console.log(`[CLIENT] Requesting to remove user ${targetUsername}.`);
            socket.emit('removeUser', targetUsername);
        }
    }
}

function saveAppearanceSettings() {
    const appearanceData = {
        bgColor: bgColorInput.value,
        bgImageUrl: bgImageInput.value.trim() || null, // Send null if empty
        logoUrl: logoUrlInput.value.trim() || null // Send null if empty
    };
    console.log('[CLIENT] Saving appearance settings:', appearanceData);
    socket.emit('updateAppearance', appearanceData);
    hideStatusMessage(appearanceStatus);
}

function updateLocalAppearancePreview() {
    // Only updates the local preview, doesn't save
    const settings = {
        bgColor: bgColorInput.value,
        bgImageUrl: bgImageInput.value.trim() || null,
        logoUrl: logoUrlInput.value.trim() || null
    };
    applyAppearanceSettings(settings);
}

// --- Copy VS String Function ---
async function copyVsStringToClipboard() {
    console.log("[CLIENT] Copy VS button clicked.");
    try {
        const response = await fetch('/vs');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const vsText = await response.text();
        console.log("[CLIENT] Fetched /vs text:", vsText);

        if (!vsText || vsText === "No characters chosen yet!") {
            showStatusMessage(copyVsBtn, "Nothing to copy yet!", true, 2000);
            setTimeout(() => { copyVsBtn.disabled = false; }, 2000);
            return;
        }

        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(vsText);
            console.log("[CLIENT] Copied to clipboard:", vsText);
            const originalText = copyVsBtn.textContent;
            copyVsBtn.textContent = 'Copied!';
            copyVsBtn.disabled = true;
            showStatusMessage(copyVsBtn, 'Copied!', false, 2000);
            setTimeout(() => {
                copyVsBtn.textContent = originalText;
                copyVsBtn.disabled = false;
                hideStatusMessage(copyVsBtn);
            }, 2000);
        } else {
            console.warn("[CLIENT] Clipboard API not available or context insecure.");
            alert('Clipboard API not available. Prompt text:\n\n' + vsText);
        }
    } catch (error) {
        console.error('[CLIENT] Failed to fetch or copy /vs string:', error);
        alert('Failed to copy battle prompt. See console for details.');
        copyVsBtn.disabled = false;
    }
}

// --- Event Listeners ---
// *** ADDED LOG ***
if (saveUsernameBtn) {
    saveUsernameBtn.addEventListener('click', registerUsername);
    console.log("[CLIENT] Added click listener to saveUsernameBtn.");
} else {
    console.error("[CLIENT] saveUsernameBtn not found!");
}
if (usernameInput) {
    usernameInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') registerUsername(); });
    console.log("[CLIENT] Added keypress listener to usernameInput.");
} else {
    console.error("[CLIENT] usernameInput not found!");
}
// Keep other listeners...
submitBtn.addEventListener('click', submitChoice);
characterNameInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') submitChoice(); });
profileSettingsToggle.addEventListener('click', showProfileSettings);
adminSettingsBtn.addEventListener('click', () => toggleSettingsSection(adminSettingsSection));
saveProfileBtn.addEventListener('click', saveProfile);
profilePfpUrlInput.addEventListener('input', updatePfpPreview);
pfpPresetChoiceRadio.addEventListener('change', togglePfpInputMethod);
pfpCustomChoiceRadio.addEventListener('change', togglePfpInputMethod);
adminUserListContainer.addEventListener('click', handleAdminUserListClick);
copyVsBtn.addEventListener('click', copyVsStringToClipboard);
saveAppearanceBtn.addEventListener('click', saveAppearanceSettings);
bgColorInput.addEventListener('input', updateLocalAppearancePreview);
bgImageInput.addEventListener('input', updateLocalAppearancePreview);
logoUrlInput.addEventListener('input', updateLocalAppearancePreview);

// --- Socket.IO Event Handlers ---
socket.on('connect', () => {
    // *** ADDED LOG ***
    console.log('[CLIENT] Successfully connected to server via Socket.IO:', socket.id);
    connectionErrorMsg.classList.add('hidden');
    populatePresetPfps();
    const savedUsername = localStorage.getItem('starlightUsername');
    if (savedUsername) {
        console.log(`[CLIENT] Found saved username: ${savedUsername}. Attempting auto-register.`);
        currentUsername = savedUsername;
        socket.emit('registerUser', savedUsername); // Re-register on connect if username exists
    } else {
        console.log("[CLIENT] No saved username found. Showing registration prompt.");
        mainContent.classList.add('hidden');
        profileSettingsSection?.classList.add('hidden');
        adminSettingsSection?.classList.add('hidden');
        usernamePrompt?.classList.remove('hidden');
        registrationErrorMsg?.classList.add('hidden');
    }
});

socket.on('registrationSuccess', (data) => {
    console.log('[CLIENT] Received registrationSuccess:', data.username, 'isAdmin:', data.isAdmin);
    currentUsername = data.username;
    isAdmin = data.isAdmin;
    localStorage.setItem('starlightUsername', currentUsername);

    currentChoices = data.initialData.choices || {};
    const serverData = currentChoices[currentUsername];
    currentUserData = {
        word: serverData?.word || null,
        pfpUrl: serverData?.pfpUrl || DEFAULT_PFP,
        isAdmin: isAdmin
    };
    console.log("[CLIENT] Set currentUserData:", currentUserData);
    applyAppearanceSettings(data.initialData.appearance);

    updateTable(currentChoices);
    showMainAppInterface();
});

socket.on('registrationError', (message) => {
    console.error('[CLIENT] Received registrationError:', message);
    registrationErrorMsg.textContent = message;
    registrationErrorMsg.classList.remove('hidden');
    mainContent.classList.add('hidden');
    usernamePrompt.classList.remove('hidden');
    usernameInput.focus();
});

socket.on('initialState', (state) => {
    console.log('[CLIENT] Received initialState:', state);
    currentChoices = state.choices || {};
    applyAppearanceSettings(state.appearance);

    updateTable(currentChoices);
    if (currentUsername && currentChoices[currentUsername]) {
        currentUserData = currentChoices[currentUsername];
        isAdmin = currentUserData.isAdmin;
        console.log("[CLIENT] Updated currentUserData from initialState:", currentUserData);
        if (!mainContent.classList.contains('hidden')) {
            adminSettingsBtn.classList.toggle('hidden', !isAdmin);
            copyVsBtn.classList.toggle('hidden', !isAdmin);
        }
    } else if (currentUsername && !currentChoices[currentUsername]) {
        console.log("[CLIENT] User mismatch on initialState. Clearing local state.");
        localStorage.removeItem('starlightUsername');
        currentUsername = null; isAdmin = false; currentUserData = {};
        usernamePrompt.classList.remove('hidden');
        mainContent.classList.add('hidden');
    }
});

socket.on('updateChoices', (choices) => {
    console.log('[CLIENT] Received updateChoices:', choices);
    currentChoices = choices;

    if (currentUsername && currentChoices[currentUsername]) {
        currentUserData = currentChoices[currentUsername];
        const newlyAdmin = currentUserData.isAdmin;
        if (newlyAdmin !== isAdmin) {
            console.log(`[CLIENT] Admin status changed locally to: ${newlyAdmin}`);
            isAdmin = newlyAdmin;
            if (!isAdmin && adminSettingsSection) {
                adminSettingsSection.classList.add('hidden');
            }
        }
    } else if (currentUsername && !currentChoices[currentUsername]) {
        console.log("[CLIENT] Current user removed by server update. Forcing logout.");
        alert("You have been removed from the session.");
        localStorage.removeItem('starlightUsername');
        currentUsername = null; isAdmin = false; currentUserData = {}; currentChoices = {};
        mainContent.classList.add('hidden');
        profileSettingsSection?.classList.add('hidden');
        adminSettingsSection?.classList.add('hidden');
        usernamePrompt?.classList.remove('hidden');
        updateTable({});
        return;
    }

    updateTable(currentChoices);

    if(currentUsername) {
        adminSettingsBtn?.classList.toggle('hidden', !isAdmin);
        copyVsBtn?.classList.toggle('hidden', !isAdmin);
        if (adminSettingsSection && !adminSettingsSection.classList.contains('hidden')) {
            populateAdminUserList(currentChoices);
        }
    }
});

socket.on('applyAppearance', (settings) => {
    console.log("[CLIENT] Received applyAppearance from server.");
    applyAppearanceSettings(settings);
});

socket.on('choiceError', (message) => { showStatusMessage(choiceErrorMsg, message, true); });
socket.on('profileUpdateSuccess', (message) => { showStatusMessage(profileUpdateStatus, message, false); });
socket.on('profileUpdateError', (message) => { showStatusMessage(profileUpdateStatus, message, true); });
socket.on('adminActionError', (message) => { showStatusMessage(adminUserMgmtStatus, message, true); });
socket.on('adminActionSuccess', (message) => { showStatusMessage(adminUserMgmtStatus, message, false); });
socket.on('appearanceUpdateSuccess', (message) => { showStatusMessage(appearanceStatus, message, false); });
socket.on('appearanceUpdateError', (message) => { showStatusMessage(appearanceStatus, message, true); });
socket.on('usernameChanged', (newUsername) => {
    console.log(`[CLIENT] Username changed locally to: ${newUsername}`);
    currentUsername = newUsername;
    localStorage.setItem('starlightUsername', currentUsername);
    if(welcomeMessage) welcomeMessage.textContent = `Welcome, ${currentUsername}!`;
});

socket.on('connect_error', (err) => {
    // *** ADDED LOG ***
    console.error('[CLIENT] Connection Error:', err.message); // Log the actual error message
    connectionErrorMsg.textContent = '⚠️ Connection to server failed. Please ensure the server is running and refresh. ⚠️';
    connectionErrorMsg.classList.remove('hidden');
});

socket.on('disconnect', (reason) => {
    // *** ADDED LOG ***
    console.warn(`[CLIENT] Disconnected: ${reason}`);
    connectionErrorMsg.textContent = '⚠️ Disconnected from server. Attempting to reconnect... Please refresh if issues persist. ⚠️';
    connectionErrorMsg.classList.remove('hidden');
});

socket.on('reconnect', (attemptNumber) => {
    console.log(`[CLIENT] Reconnected to server after ${attemptNumber} attempts.`);
    connectionErrorMsg.classList.add('hidden');
    if (currentUsername) {
        console.log("[CLIENT] Attempting to re-register after reconnect...");
        socket.emit('registerUser', currentUsername);
    } else {
        console.log("[CLIENT] No current username on reconnect, showing prompt.");
        usernamePrompt?.classList.remove('hidden');
        mainContent?.classList.add('hidden');
    }
});