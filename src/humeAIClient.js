const WebSocket = require('ws');
const { addToContext } = require('./contextManager');
const { log, startPing } = require('./utils');
const { MAX_RECONNECT_ATTEMPTS } = require('./constants');
const { setupAudioListener, playNextAudio, stopAudio, playUnderstandingSound, playNotUnderstoodSound } = require('./audioHandler');
const shared = require('./shared');
const { getContext } = require('./contextManager');

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
        
        shared.humeSocket = new WebSocket(url);  

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

async function handleHumeMessage(message, connection, client) {
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
            }
            responseTimer = setTimeout(() => {
                if (shared.botMessageBuffer.length > 0) {
                    const botResponse = shared.botMessageBuffer.join(' ');
                    addToContext('Bot', botResponse);
                    shared.botMessageBuffer = [];
                }
            }, 0); // Wait for 1 second before processing
            break;
        case 'user_message':
            if (message.message && message.message.content) {
                await playUnderstandingSound(connection);
                lastUserMessage = message.message.content;  
                addToContext('User', message.message.content);
                shared.isWaitingForEnd = false;
            } else {
                log('Received user message with no content');
                await playNotUnderstoodSound(connection);
            }
            break;
        case 'user_interruption':
            stopAudio();
            break;
        case 'assistant_end':
            if (responseTimer) {
                clearTimeout(responseTimer);
                responseTimer = null;
            }
            if (shared.botMessageBuffer.length > 0) {
                const botResponse = shared.botMessageBuffer.join(' ');
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
            await playNotUnderstoodSound(connection);
            break;
        case 'understanding':
            if (message.understood) {
                log('Bot understood the message');
                playUnderstandingSound(connection);
            }
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
            break;
        case 'AUTHENTICATION_ERROR':
            log('Authentication error. Please check your Hume AI credentials.');
            break;
        default:
            log(`Unknown error occurred with Hume AI: ${message.message}`);

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
                enabled: true
            }
        },
        context: getContext() 
    };

    try {
        shared.humeSocket.send(JSON.stringify(sessionSettings));
        shared.lastSentMessage = sessionSettings;  
    } catch (error) {
        log(`Error sending session settings: ${error}`);
    }
}


module.exports = { setupHumeAI, handleHumeMessage };
