// src/audioHandler.js
const { Readable } = require('stream');
const prism = require('prism-media');
const { createAudioPlayer, createAudioResource, AudioPlayerStatus, EndBehaviorType } = require('@discordjs/voice');
const { log } = require('./utils');
const shared = require('./shared');
const WebSocket = require('ws');
const config = require('./config');

let audioPlayer = null;


let lastUserInputTime = 0;
let lastUserMessage = null;

const BUFFER_DURATION = 500; // Buffer 500ms of audio before sending
const SAMPLE_RATE = 48000;
const BYTES_PER_SAMPLE = 2; // 16-bit audio

function setupAudioListener(connection, client) {
    const receiver = connection.receiver;
    log('Setting up audio listener');

    receiver.speaking.on('start', async (userId) => {
        try {
            const user = await client.users.fetch(userId);
            log(`User ${user.username} started speaking`);
            if (shared.humeSocket && shared.humeSocket.readyState === WebSocket.OPEN) {
                const audioStream = receiver.subscribe(userId, {
                    end: {
                        behavior: EndBehaviorType.AfterSilence,
                        duration: 1000,
                    },
                });
                handleAudioStream(audioStream);
            } else {
                log(`WebSocket is not open. Current state: ${shared.humeSocket ? shared.humeSocket.readyState : 'null'}`);
                if (!shared.isConnecting) {
                    log('Attempting to reconnect...');
                    setupHumeAI(connection, client);
                }
            }
        } catch (error) {
            log(`Error fetching user: ${error}`);
        }
    });

    receiver.speaking.on('end', async (userId) => {
        try {
            const user = await client.users.fetch(userId);
            log(`User ${user.username} stopped speaking`);
        } catch (error) {
            log(`Error fetching user: ${error}`);
        }
    });

    log('Audio listener setup complete');
}

function handleAudioStream(audioStream) {
    const opusDecoder = new prism.opus.Decoder({
        frameSize: 960,
        channels: 1,
        rate: 48000,
    });

    audioStream.on('error', (error) => {
        console.error('Audio stream error:', error);
    });

    opusDecoder.on('error', (error) => {
        console.error('Opus decoder error:', error);
    });

    let currentAudioBuffer = Buffer.alloc(0);
    let lastSendTime = Date.now();

    audioStream.pipe(opusDecoder);

    opusDecoder.on('data', (chunk) => {
        currentAudioBuffer = Buffer.concat([currentAudioBuffer, chunk]);
        
        const bufferDuration = (currentAudioBuffer.length / BYTES_PER_SAMPLE) / SAMPLE_RATE * 1000;
        const timeSinceLastSend = Date.now() - lastSendTime;

        if (bufferDuration >= BUFFER_DURATION || timeSinceLastSend >= BUFFER_DURATION) {
            sendAudioChunk(currentAudioBuffer.toString('base64'));
            currentAudioBuffer = Buffer.alloc(0);
            lastSendTime = Date.now();
        }
    });

    audioStream.on('end', () => {
        if (currentAudioBuffer.length > 0) {
            sendAudioChunk(currentAudioBuffer.toString('base64'));
            currentAudioBuffer = Buffer.alloc(0);
        }
        log('Audio stream ended');
    });
}

async function playNextAudio(connection) {
    if (shared.audioQueue.length === 0) {
        shared.isPlaying = false;
        return;
    }

    shared.isPlaying = true;
    const audioData = shared.audioQueue.shift();
    const buffer = Buffer.from(audioData, 'base64');
    const audioResource = createAudioResource(Readable.from(buffer));

    if (!audioPlayer) {
        audioPlayer = createAudioPlayer();
        connection.subscribe(audioPlayer);
    }

    audioPlayer.play(audioResource);

    return new Promise((resolve) => {
        audioPlayer.once(AudioPlayerStatus.Idle, () => {
            setTimeout(() => {
                playNextAudio(connection);
                resolve();
            }, 100);
        });
    });
}

function stopAudio() {
    if (audioPlayer) {
        audioPlayer.stop();
    }
    shared.audioQueue.length = 0; // Clear the queue
    shared.isPlaying = false;
}

function sendAudioChunk(base64Audio) {
    if (shared.humeSocket && shared.humeSocket.readyState === WebSocket.OPEN) {
        const audioInput = {
            type: 'audio_input',
            data: base64Audio,
            audio: {
                channels: 1,
                encoding: "linear16",
                sample_rate: 48000
            }
        };
        shared.humeSocket.send(JSON.stringify(audioInput));
    } else {
        log('WebSocket is not open. Cannot send audio chunk.');
    }
}


module.exports = {
    setupAudioListener,
    handleAudioStream,
    playNextAudio,
    stopAudio,
    sendAudioChunk
};
