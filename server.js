// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs'); // File System module

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// --- Configuration ---
const ADMIN_CONFIG_FILE = path.join('/data', 'admin_config.json'); // Using persistent volume path (like for Fly.io)
// const ADMIN_CONFIG_FILE = path.join(__dirname, 'admin_config.json'); // Use this for local testing or non-volume hosting
const DEFAULT_PFP = 'https://picsum.photos/seed/default/50';
const MAX_CHARACTER_NAME_LENGTH = 100; // Define max length

// --- Admin Tracking ---
let adminUsername = null; // Loaded from config

// --- Data Storage (In-Memory) ---
let userChoices = {}; // Stores { "Username1": { word: "Word1", pfpUrl: "url1", isAdmin: false }, ... }

// --- Helper Functions ---
function loadAdminConfig() {
    console.log("[SERVER] Attempting to load admin config from:", ADMIN_CONFIG_FILE); // Log path
    try {
        if (fs.existsSync(ADMIN_CONFIG_FILE)) {
            const data = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf8');
            const config = JSON.parse(data);
            if (config.adminUsername) {
                adminUsername = config.adminUsername;
                console.log(`[SERVER] Admin user loaded from config: ${adminUsername}`);
            } else {
                 console.log("[SERVER] Admin config file found but no adminUsername property.");
                 adminUsername = null;
            }
        } else {
            console.log('[SERVER] Admin config file not found. First registered user will be admin.');
            adminUsername = null;
        }
    } catch (err) {
        console.error('[SERVER] Error loading admin config:', err);
         adminUsername = null;
    }
}

function saveAdminConfig() {
    console.log(`[SERVER] Attempting to save admin config to ${ADMIN_CONFIG_FILE}. Current admin: ${adminUsername}`);
    try {
        const config = { adminUsername: adminUsername };
        // Ensure directory exists if using a path like /data (might be needed on first write)
        const dir = path.dirname(ADMIN_CONFIG_FILE);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
            console.log(`[SERVER] Created directory for admin config: ${dir}`);
        }
        fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`[SERVER] Admin user saved to config: ${adminUsername}`);
    } catch (err) {
        console.error('[SERVER] Error saving admin config:', err);
    }
}

function syncAdminStatus() { /* ... (Keep existing) ... */
    Object.keys(userChoices).forEach(username => {
        if (userChoices[username]) {
             userChoices[username].isAdmin = (username === adminUsername);
        }
    });
}
function broadcastUpdates() { /* ... (Keep existing) ... */
    syncAdminStatus();
    console.log("[SERVER] Broadcasting 'updateChoices':", Object.keys(userChoices));
    io.emit('updateChoices', userChoices);
}

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname))); // Serve from project root

// --- API Endpoint for Admin 'vs' String ---
app.get('/vs', (req, res) => { /* ... (Keep existing endpoint) ... */ });

// --- Real-time Communication (Socket.IO) ---
io.on('connection', (socket) => { /* ... (Keep existing connection logic) ... */
    console.log(`[SERVER] User connected: ${socket.id}`);
    console.log(`[SERVER] Emitting 'initialState' to ${socket.id}:`, Object.keys(userChoices));
    socket.emit('initialState', userChoices);

    socket.on('registerUser', (username) => { /* ... (Keep existing registration logic) ... */
        console.log(`[SERVER] Registration attempt for username: '${username}' from socket ${socket.id}`);
        const trimmedUsername = username ? username.trim() : null;

        if (!trimmedUsername) {
            socket.emit('registrationError', 'Username cannot be empty.'); return;
        }
        if (userChoices[trimmedUsername]) {
            console.log(`[SERVER] User ${trimmedUsername} is reconnecting or already exists.`);
            socket.username = trimmedUsername;
            const isAdmin = (trimmedUsername === adminUsername);
             userChoices[trimmedUsername].isAdmin = isAdmin; // Ensure flag is correct
            console.log(`[SERVER] Re-associating socket ${socket.id} with ${trimmedUsername}. isAdmin: ${isAdmin}`);
            const successData = { username: trimmedUsername, isAdmin: isAdmin, initialData: userChoices };
            console.log(`[SERVER] Emitting 'registrationSuccess' (reconnect) to ${socket.id}`);
            socket.emit('registrationSuccess', successData);
            return;
        }
        console.log(`[SERVER] Registering NEW user ${trimmedUsername} for socket ${socket.id}`);
        socket.username = trimmedUsername;
        let isNewUserAdmin = false;
        if (!adminUsername) {
            console.log(`[SERVER] No admin found. Assigning ${trimmedUsername} as first admin.`);
            adminUsername = trimmedUsername;
            isNewUserAdmin = true;
            saveAdminConfig();
        } else {
            isNewUserAdmin = false;
            console.log(`[SERVER] Admin (${adminUsername}) already exists. ${trimmedUsername} is a regular user.`);
        }
        userChoices[trimmedUsername] = { word: null, pfpUrl: DEFAULT_PFP, isAdmin: isNewUserAdmin };
        console.log(`[SERVER] Added ${trimmedUsername} to userChoices.`);
        const successData = { username: trimmedUsername, isAdmin: isNewUserAdmin, initialData: userChoices };
        console.log(`[SERVER] Emitting 'registrationSuccess' (new user) to ${socket.id}`);
        socket.emit('registrationSuccess', successData);
        broadcastUpdates();
    });

    // Updated choice handler with length validation
    socket.on('submitChoice', (data) => {
        const username = socket.username;
        const word = data.word ? data.word.trim() : null;

        if (username && userChoices[username] && word) {
            // Server-side length validation
            if (word.length > MAX_CHARACTER_NAME_LENGTH) {
                console.log(`[SERVER] ${username} tried to submit word exceeding max length.`);
                socket.emit('choiceError', `Character name cannot exceed ${MAX_CHARACTER_NAME_LENGTH} characters.`);
                return; // Stop processing
            }
            console.log(`[SERVER] ${username} chose: ${word}`);
            userChoices[username].word = word;
            broadcastUpdates();
        } else if (!username) {
             console.log(`[SERVER] Socket ${socket.id} tried to submit choice without being registered.`);
             socket.emit('choiceError', 'Please register first.');
        } else if (username && userChoices[username] && !word) {
             socket.emit('choiceError', 'Please enter a character name.');
        } else {
             console.log(`[SERVER] Invalid choice scenario for user ${username}:`, data);
        }
    });

    socket.on('updateProfile', (data) => { /* ... (Keep existing - only PFP) ... */
        const username = socket.username;
        const newPfpUrl = data.pfpUrl ? data.pfpUrl.trim() : DEFAULT_PFP;
        if (!username || !userChoices[username]) {
            console.log(`[SERVER] Profile update failed: User ${username} not found.`);
            socket.emit('profileUpdateError', 'Cannot update profile. User not recognized.'); return;
        }
        console.log(`[SERVER] Updating PFP for ${username}`);
        userChoices[username].pfpUrl = newPfpUrl;
        broadcastUpdates();
        socket.emit('profileUpdateSuccess', 'Profile picture updated!');
    });
    socket.on('setAdmin', (targetUsername) => { /* ... (Keep existing) ... */
         const requesterUsername = socket.username;
        if (!requesterUsername || requesterUsername !== adminUsername) {
             socket.emit('adminActionError', 'Only the current admin can perform this action.'); return;
        }
        if (!targetUsername || !userChoices[targetUsername]) {
             socket.emit('adminActionError', 'Target user not found.'); return;
        }
        if (targetUsername === requesterUsername) {
             socket.emit('adminActionError', 'You cannot make yourself admin again.'); return;
        }
        if (userChoices[targetUsername].isAdmin) {
             socket.emit('adminActionError', `${targetUsername} is already the admin.`); return;
        }
        console.log(`[SERVER] Admin ${requesterUsername} is making ${targetUsername} the new admin.`);
        adminUsername = targetUsername;
        saveAdminConfig();
        broadcastUpdates();
        socket.emit('adminActionSuccess', `Successfully made ${targetUsername} the new admin.`);
    });
    socket.on('removeUser', (targetUsername) => { /* ... (Keep existing) ... */
          const requesterUsername = socket.username;
        if (!requesterUsername || requesterUsername !== adminUsername) {
             socket.emit('adminActionError', 'Only the current admin can perform this action.'); return;
        }
        if (!targetUsername || !userChoices[targetUsername]) {
             socket.emit('adminActionError', 'Target user not found.'); return;
        }
         if (targetUsername === requesterUsername) {
             socket.emit('adminActionError', 'Admin cannot remove themselves using this panel.'); return;
         }
        console.log(`[SERVER] Admin ${requesterUsername} is removing user ${targetUsername}.`);
        const targetWasAdmin = userChoices[targetUsername].isAdmin;
        if(targetWasAdmin && Object.keys(userChoices).length <= 1) {
            console.log(`[SERVER] Denying removal of sole admin user ${targetUsername}.`);
            socket.emit('adminActionError', 'Cannot remove the only user while they are the admin.'); return;
        }
        delete userChoices[targetUsername];
         if (targetWasAdmin) {
              console.warn(`[SERVER] Removed user ${targetUsername} was admin! Resetting admin.`);
              adminUsername = null;
              saveAdminConfig();
         }
        // Find and disconnect socket
        for (const [id, sock] of io.of("/").sockets) {
            if (sock.username === targetUsername) {
                console.log(`[SERVER] Disconnecting removed user ${targetUsername} (socket ${id})`);
                sock.disconnect(true); break; // Assume only one socket per user for now
            }
        }
        broadcastUpdates();
        socket.emit('adminActionSuccess', `User ${targetUsername} removed successfully.`);
    });
    socket.on('disconnect', (reason) => { /* ... (Keep existing) ... */ });
});

// --- Initialize Admin Config & Start Server ---
loadAdminConfig();
server.listen(port, () => { /* ... (Keep existing) ... */ });