const WebSocket = require('ws');
const { addToContext } = require('./contextManager');
const { log, startPing } = require('./utils');
const { MAX_RECONNECT_ATTEMPTS } = require('./constants');
const { setupAudioListener, playNextAudio, stopAudio } = require('./audioHandler');
const shared = require('./shared');

let chatGroupId = null;
let reconnectAttempts = 0;
let responseTimer = null;

async function setupHumeAI(connection, client) {
    if (shared.isConnecting) return;
    shared.isConnecting = true;

    try {
        console.log(process.env.HUME_CONFIG_ID);
        console.log(`ChatGroupId: ${chatGroupId}`);
        const url = `wss://api.hume.ai/v0/evi/chat?config_id=${process.env.HUME_CONFIG_ID}&api_key=${process.env.HUME_API_KEY}`;
        if (chatGroupId) {
            url += `&resumed_chat_group_id=${chatGroupId}`;
        }
        
        log(`Attempting to connect to Hume AI: ${url}`);
        
        shared.humeSocket = new WebSocket(url);  // Assign to shared.humeSocket instead of humeSocket

        shared.humeSocket.on('open', () => {
            log('Connected to Hume AI');
            shared.isConnecting = false;
            reconnectAttempts = 0;
            sendSessionSettings();
            setupAudioListener(connection, client);
            startPing();
        });

        shared.humeSocket.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                handleHumeMessage(message, connection, client);
            } catch (error) {
                log(`Error parsing message from Hume AI: ${error}`);
            }
        });
         

        shared.humeSocket.on('error', (error) => {
            log(`Hume WebSocket error: ${error}`);
            shared.isConnecting = false;
        });

        shared.humeSocket.on('close', (code, reason) => {
            log(`Hume WebSocket closed. Code: ${code}, Reason: ${reason}`);
            shared.isConnecting = false;
            
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                setTimeout(() => setupHumeAI(connection, client), 5000 * reconnectAttempts);
            } else {
                log('Max reconnection attempts reached. Please check your configuration and network.');
            }
        });
    } catch (error) {
        log(`Error setting up Hume AI: ${error}`);
        shared.isConnecting = false;
    }
}

function handleHumeMessage(message, connection, client) {
    if (!message || typeof message !== 'object') {
        log('Received invalid message from Hume AI');
        return;
    }

    switch (message.type) {
        case 'audio_output':
            shared.audioQueue.push(message.data);
            if (!shared.isPlaying) {
                playNextAudio(connection);
            }
            break;
        case 'assistant_message':
            shared.botMessageBuffer.push(message.message.content);
            if (responseTimer) {
                clearTimeout(responseTimer);
                responseTimer = null;
            }
            // Don't reset lastUserMessage here, as we might need it for the next interaction
            break;
        case 'user_message':
            if (message.message && message.message.content) {
                log(`User: ${message.message.content}`);
                lastUserMessage = message.message.content;  // Update lastUserMessage here
                addToContext('User', message.message.content);
                shared.isWaitingForEnd = false;
                log('Processing your input...');
            } else {
                log('Received user message with no content');
            }
            break;
        case 'user_interruption':
            stopAudio();
            break;
        case 'assistant_end':
            if (shared.botMessageBuffer.length > 0) {
                const botResponse = shared.botMessageBuffer.join(' ');
                log(`Bot: ${botResponse}`);
                addToContext('Bot', botResponse);
                shared.botMessageBuffer = [];
            }
            shared.isProcessing = false;
            break;
        case 'chat_metadata':
            log('Received chat metadata:');
            log(JSON.stringify(message, null, 2));
            break;
        case 'error':
            handleHumeError(message, connection, client);
            break;
        default:
            log(`Unhandled message type: ${message.type}`);
            log(JSON.stringify(message, null, 2));
    }
}

function handleHumeError(message, connection, client) {
    log(`Hume AI Error: ${JSON.stringify(message)}`);
    
    switch(message.code) {
        case 'E0101':
            log(`Payload parse error: ${message.message}`);
            log(`Last sent message: ${JSON.stringify(shared.lastSentMessage)}`);
            // Consider reviewing recent changes to message formats
            break;
        case 'AUTHENTICATION_ERROR':
            log('Authentication error. Please check your Hume AI credentials.');
            break;
        default:
            log(`Unknown error occurred with Hume AI: ${message.message}`);
            // Consider implementing a reconnection mechanism here
            // reconnectToHumeAI(connection, client);
    }
}

function sendSessionSettings() {
    const sessionSettings = {
        type: "session_settings",
        audio: {
            channels: 1,
            encoding: "linear16",
            sample_rate: 48000,
            speaker_detection: true,
            vad: {
                enabled: false
            }
        }
    };

    
    try {
        shared.humeSocket.send(JSON.stringify(sessionSettings));
    } catch (error) {
        log(`Error sending session settings: ${error}`);
    }
}


module.exports = { setupHumeAI, handleHumeMessage };
