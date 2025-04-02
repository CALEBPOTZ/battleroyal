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
const MAX_CHARACTER_NAME_LENGTH = 100;

// --- DOM Elements ---
// It's good practice to ensure elements exist after DOM load
let connectionErrorMsg, usernamePrompt, usernameInput, saveUsernameBtn, registrationErrorMsg,
    mainContent, welcomeMessage, adminSettingsBtn, profileSettingsToggle, copyVsBtn,
    profileSettingsSection, profileUsernameInput, profilePfpUrlInput, profilePfpPreview,
    saveProfileBtn, profileUpdateStatus, pfpPresetContainer, pfpCustomUrlContainer,
    pfpPresetChoiceRadio, pfpCustomChoiceRadio, characterNameInput, submitBtn, choiceErrorMsg,
    resultsTableBody, adminSettingsSection, adminUserListContainer, adminUserMgmtStatus,
    bgColorInput, bgImageInput, logoUrlInput, appLogo, bodyElement, root;

// Function to get elements, run after DOM is ready
function getDOMElements() {
    connectionErrorMsg = document.getElementById('connectionErrorMsg');
    usernamePrompt = document.getElementById('usernamePrompt');
    usernameInput = document.getElementById('usernameInput');
    saveUsernameBtn = document.getElementById('saveUsernameBtn');
    registrationErrorMsg = document.getElementById('registrationError');
    mainContent = document.getElementById('mainContent');
    welcomeMessage = document.getElementById('welcomeMessage');
    adminSettingsBtn = document.getElementById('adminSettingsBtn');
    profileSettingsToggle = document.getElementById('profileSettingsToggle');
    copyVsBtn = document.getElementById('copyVsBtn');
    profileSettingsSection = document.getElementById('profileSettingsSection');
    profileUsernameInput = document.getElementById('profileUsername');
    profilePfpUrlInput = document.getElementById('profilePfpUrl');
    profilePfpPreview = document.getElementById('profilePfpPreview');
    saveProfileBtn = document.getElementById('saveProfileBtn');
    profileUpdateStatus = document.getElementById('profileUpdateStatus');
    pfpPresetContainer = document.getElementById('pfpPresetContainer');
    pfpCustomUrlContainer = document.getElementById('pfpCustomUrlContainer');
    pfpPresetChoiceRadio = document.getElementById('pfpPresetChoice');
    pfpCustomChoiceRadio = document.getElementById('pfpCustomChoice');
    characterNameInput = document.getElementById('characterName');
    submitBtn = document.getElementById('submitBtn');
    choiceErrorMsg = document.getElementById('choiceError');
    resultsTableBody = document.getElementById('resultsTable')?.querySelector('tbody'); // Use optional chaining for table
    adminSettingsSection = document.getElementById('adminSettingsSection');
    adminUserListContainer = document.getElementById('adminUserListContainer');
    adminUserMgmtStatus = document.getElementById('adminUserMgmtStatus');
    bgColorInput = document.getElementById('bgColor');
    bgImageInput = document.getElementById('bgImage');
    logoUrlInput = document.getElementById('logoUrl');
    appLogo = document.getElementById('appLogo');
    bodyElement = document.body;
    root = document.documentElement;

    console.log("[CLIENT] DOM Elements reference check complete."); // DEBUG
    if (!resultsTableBody) console.error("resultsTableBody not found!"); // Specific check
}


// --- State ---
let currentUsername = null;
let isAdmin = false;
let currentUserData = {};
let selectedPfpUrl = DEFAULT_PFP;
let currentChoices = {};
let copyButtonTimeout = null;

// --- Utility Functions ---
function showStatusMessage(element, message, isError = false, duration = 4000) { /* ... (Keep existing) ... */ }
function hideStatusMessage(element) { /* ... (Keep existing) ... */ }


// --- Core Functions ---

// Updates the MAIN results table display (No action column)
function updateTable(choices) {
    console.log("[CLIENT] updateTable function START");
    try { // *** Added Try ***
        if (!resultsTableBody) { // Check if table body exists
             console.error("[CLIENT] Cannot update table, resultsTableBody is missing.");
             return;
        }
        resultsTableBody.innerHTML = ''; // Clear existing rows
        const usernames = Object.keys(choices);

        if (usernames.length === 0) {
            resultsTableBody.innerHTML = '<tr><td colspan="3">No challengers yet...</td></tr>'; // Colspan is 3 now
            console.log("[CLIENT] updateTable function END (no users)");
            return;
        }

        usernames.sort().forEach(user => {
            const data = choices[user];
            if (!data) return; // Skip if data somehow missing

            const row = resultsTableBody.insertRow();

            // PFP Cell
            const pfpCell = row.insertCell();
            pfpCell.classList.add('pfp-col');
            const pfpImg = document.createElement('img');
            pfpImg.src = data.pfpUrl || DEFAULT_PFP;
            pfpImg.alt = `${user} PFP`;
            pfpImg.onerror = function() { this.src = DEFAULT_PFP; };
            pfpCell.appendChild(pfpImg);

            // User Cell
            const userCell = row.insertCell();
            userCell.textContent = user;
            if (data.isAdmin) {
                const crown = document.createElement('span');
                crown.className = 'admin-crown'; crown.title = 'Admin'; crown.textContent = '👑';
                userCell.appendChild(crown);
            }

            // Word Cell
            const wordCell = row.insertCell();
            wordCell.textContent = data.word || '...';
        });
    } catch (error) { // *** Added Catch ***
         console.error("[CLIENT] Error inside updateTable:", error);
    }
     console.log("[CLIENT] updateTable function END");
}

// Populates the user list within the ADMIN settings panel
function populateAdminUserList(choices) { /* ... (Keep existing - maybe add try/catch later if needed) ... */ }

// Shows the main app UI after successful login/registration
function showMainAppInterface() {
    console.log("[CLIENT] showMainAppInterface START"); // DEBUG
    try { // *** Added Try ***
        if (!currentUsername) {
            console.error("[CLIENT] showMainAppInterface aborted: No currentUsername!");
            usernamePrompt?.classList.remove('hidden');
            mainContent?.classList.add('hidden');
            return;
        }
        // Check if elements exist before manipulating classList
        if (usernamePrompt) usernamePrompt.classList.add('hidden'); else console.error("showMainAppInterface: usernamePrompt missing");
        if (mainContent) mainContent.classList.remove('hidden'); else console.error("showMainAppInterface: mainContent missing");
        if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${currentUsername}!`; else console.error("showMainAppInterface: welcomeMessage missing");

        const showAdminButtons = isAdmin;
        if (adminSettingsBtn) adminSettingsBtn.classList.toggle('hidden', !showAdminButtons); else console.error("showMainAppInterface: adminSettingsBtn missing");
        if (copyVsBtn) copyVsBtn.classList.toggle('hidden', !showAdminButtons); else console.error("showMainAppInterface: copyVsBtn missing");

        if (!showAdminButtons && adminSettingsSection) {
             adminSettingsSection.classList.add('hidden');
        }
        if (profileSettingsToggle) profileSettingsToggle.classList.remove('hidden'); else console.error("showMainAppInterface: profileSettingsToggle missing");

    } catch(error) { // *** Added Catch ***
         console.error("[CLIENT] Error inside showMainAppInterface:", error);
    }
    console.log("[CLIENT] showMainAppInterface END"); // DEBUG
}

// Registers the username with the server
function registerUsername() { /* ... (Keep existing) ... */ }
// Submits the character choice with length validation
function submitChoice() { /* ... (Keep existing) ... */ }
// Toggles visibility of a given settings section
function toggleSettingsSection(sectionElement) { /* ... (Keep existing) ... */ }
// --- Profile Settings Functions ---
function populatePresetPfps() { /* ... (Keep existing) ... */ }
function handlePresetPfpClick(event) { /* ... (Keep existing) ... */ }
function togglePfpInputMethod() { /* ... (Keep existing) ... */ }
function showProfileSettings() { /* ... (Keep existing) ... */ }
function updatePfpPreview() { /* ... (Keep existing) ... */ }
function saveProfile() { /* ... (Keep existing) ... */ }
// --- Admin Panel Functions ---
function handleAdminUserListClick(event) { /* ... (Keep existing) ... */ }
// --- Copy VS String Function (Fixed Timeout) ---
async function copyVsStringToClipboard() { /* ... (Keep existing) ... */ }


// --- Event Listeners Setup Function ---
function setupEventListeners() {
    console.log("[CLIENT] Setting up event listeners..."); // DEBUG
    if (saveUsernameBtn) saveUsernameBtn.addEventListener('click', registerUsername); else console.error("Cannot find saveUsernameBtn");
    if (usernameInput) usernameInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') registerUsername(); }); else console.error("Cannot find usernameInput");
    if (submitBtn) submitBtn.addEventListener('click', submitChoice); else console.error("Cannot find submitBtn");
    if (characterNameInput) characterNameInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') submitChoice(); }); else console.error("Cannot find characterNameInput");
    if (profileSettingsToggle) profileSettingsToggle.addEventListener('click', showProfileSettings); else console.error("Cannot find profileSettingsToggle");
    if (adminSettingsBtn) adminSettingsBtn.addEventListener('click', () => toggleSettingsSection(adminSettingsSection)); else console.error("Cannot find adminSettingsBtn");
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile); else console.error("Cannot find saveProfileBtn");
    if (profilePfpUrlInput) profilePfpUrlInput.addEventListener('input', updatePfpPreview); else console.error("Cannot find profilePfpUrlInput");
    if (pfpPresetChoiceRadio) pfpPresetChoiceRadio.addEventListener('change', togglePfpInputMethod); else console.error("Cannot find pfpPresetChoiceRadio");
    if (pfpCustomChoiceRadio) pfpCustomChoiceRadio.addEventListener('change', togglePfpInputMethod); else console.error("Cannot find pfpCustomChoiceRadio");
    if (adminUserListContainer) adminUserListContainer.addEventListener('click', handleAdminUserListClick); else console.error("Cannot find adminUserListContainer");
    if (copyVsBtn) copyVsBtn.addEventListener('click', copyVsStringToClipboard); else console.error("Cannot find copyVsBtn");
    if (bgColorInput) bgColorInput.addEventListener('input', (e) => { root.style.setProperty('--bg-image', 'none'); root.style.setProperty('--bg-color-fallback', e.target.value); bodyElement.style.backgroundColor = e.target.value; bodyElement.style.backgroundImage = 'none'; }); else console.error("Cannot find bgColorInput");
    if (bgImageInput) bgImageInput.addEventListener('change', (e) => { const url = e.target.value.trim(); if (url) { const newBg = `url('${url}')`; root.style.setProperty('--bg-image', newBg); bodyElement.style.backgroundImage = newBg; } else { const defaultGradient = 'linear-gradient(135deg, #8BC6EC 0%, #9599E2 100%)'; root.style.setProperty('--bg-image', defaultGradient); root.style.setProperty('--bg-color-fallback', '#8BC6EC'); bodyElement.style.backgroundImage = defaultGradient; bodyElement.style.backgroundColor = 'var(--bg-color-fallback)'; } }); else console.error("Cannot find bgImageInput");
    if (logoUrlInput) logoUrlInput.addEventListener('change', (e) => { const url = e.target.value.trim(); const defaultLogo = 'https://via.placeholder.com/50/FFFFFF/000000?text=★'; appLogo.src = url || defaultLogo; }); else console.error("Cannot find logoUrlInput");
    console.log("[CLIENT] Event listeners setup complete."); // DEBUG
}

// --- Socket.IO Event Handlers ---

socket.on('connect', () => {
    console.log('[CLIENT] Connected to server via Socket.IO:', socket.id);
    connectionErrorMsg?.classList.add('hidden'); // Use optional chaining
    populatePresetPfps();
    const savedUsername = localStorage.getItem('starlightUsername');
    if (savedUsername) {
        console.log(`[CLIENT] Found saved username: ${savedUsername}. Attempting auto-register.`);
        currentUsername = savedUsername;
        socket.emit('registerUser', savedUsername);
    } else {
        console.log("[CLIENT] No saved username found. Showing registration prompt.");
        mainContent?.classList.add('hidden');
        profileSettingsSection?.classList.add('hidden');
        adminSettingsSection?.classList.add('hidden');
        usernamePrompt?.classList.remove('hidden');
        registrationErrorMsg?.classList.add('hidden');
    }
});

socket.on('registrationSuccess', (data) => {
    console.log('[CLIENT] Listener for "registrationSuccess" FIRED. Data received.');
    try { // *** Added Try ***
        currentUsername = data.username;
        isAdmin = data.isAdmin;
        localStorage.setItem('starlightUsername', currentUsername);

        currentChoices = data.initialData || {};
        const serverData = currentChoices[currentUsername];
        currentUserData = {
            word: serverData?.word || null,
            pfpUrl: serverData?.pfpUrl || DEFAULT_PFP,
            isAdmin: isAdmin
        };
        console.log("[CLIENT] Set currentUserData:", currentUserData);

        console.log("[CLIENT] Calling updateTable...");
        updateTable(currentChoices);
        console.log("[CLIENT] updateTable finished.");

        console.log("[CLIENT] Calling showMainAppInterface...");
        showMainAppInterface();
        console.log("[CLIENT] showMainAppInterface call finished in success handler."); // Renamed log

    } catch (error) { // *** Added Catch ***
        console.error("[CLIENT] Error inside 'registrationSuccess' handler:", error);
    }
});

socket.on('registrationError', (message) => { /* ... (Keep existing) ... */ });
socket.on('initialState', (choices) => { /* ... (Keep existing) ... */ });
socket.on('updateChoices', (choices) => { /* ... (Keep existing) ... */ });
socket.on('choiceError', (message) => { showStatusMessage(choiceErrorMsg, message, true); });
socket.on('profileUpdateSuccess', (message) => { showStatusMessage(profileUpdateStatus, message, false); });
socket.on('profileUpdateError', (message) => { showStatusMessage(profileUpdateStatus, message, true); });
socket.on('adminActionError', (message) => { showStatusMessage(adminUserMgmtStatus, message, true); });
socket.on('adminActionSuccess', (message) => { showStatusMessage(adminUserMgmtStatus, message, false); });
socket.on('usernameChanged', (newUsername) => { /* ... (Keep existing) ... */ });
socket.on('connect_error', (err) => { /* ... (Keep existing) ... */ });
socket.on('disconnect', (reason) => { /* ... (Keep existing) ... */ });
socket.on('reconnect', (attemptNumber) => { /* ... (Keep existing) ... */ });

// --- Initial Setup ---
// Defer getting elements and setting listeners until DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("[CLIENT] DOM Content Loaded."); // DEBUG
    getDOMElements(); // Get references to all elements
    setupEventListeners(); // Setup listeners after elements are found
    // Note: Socket connection attempt starts automatically via io() at top level
});