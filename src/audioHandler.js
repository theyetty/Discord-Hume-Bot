// src/audioHandler.js
const { Readable } = require('stream');
const prism = require('prism-media');
const { createAudioPlayer, createAudioResource, AudioPlayerStatus, EndBehaviorType } = require('@discordjs/voice');
const { log } = require('./utils');
const { MIN_AUDIO_LENGTH } = require('./constants');
const shared = require('./shared');
const WebSocket = require('ws');

let currentAudioBuffer = Buffer.alloc(0);
let isWaitingForEnd = false;
let audioPlayer = null;

function setupAudioListener(connection, client) {
    const receiver = connection.receiver;
    log('Setting up audio listener');

    receiver.speaking.on('start', (userId) => {
        log(`User ${userId} started speaking`);
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
    });

    receiver.speaking.on('end', (userId) => {
        log(`User ${userId} stopped speaking`);
    });

    log('Audio listener setup complete');
}

function handleAudioStream(audioStream) {
    const opusDecoder = new prism.opus.Decoder({
        frameSize: 960,
        channels: 1,
        rate: 48000,
    });

    audioStream.pipe(opusDecoder);

    opusDecoder.on('data', (chunk) => {
        currentAudioBuffer = Buffer.concat([currentAudioBuffer, chunk]);
        
        if (currentAudioBuffer.length >= MIN_AUDIO_LENGTH) { // Send only if buffer length is above the minimum threshold
            sendAudioChunk(currentAudioBuffer.toString('base64'));
            currentAudioBuffer = Buffer.alloc(0);
        }
    });

    audioStream.on('end', () => {
        if (currentAudioBuffer.length > 0) {
            sendAudioChunk(currentAudioBuffer.toString('base64'));
            currentAudioBuffer = Buffer.alloc(0);
        }
        log('Audio stream ended');
        isWaitingForEnd = true;
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
            }, 100); // Small delay to ensure the audio player is ready for the next clip
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
            context: shared.conversationContext,
        };
        shared.humeSocket.send(JSON.stringify(audioInput));
    }
}

function sendEndOfStream() {
    if (shared.humeSocket && shared.humeSocket.readyState === WebSocket.OPEN) {
        const endOfStreamMessage = {
            type: 'end_of_stream',
            context: shared.conversationContext,

        };
        shared.humeSocket.send(JSON.stringify(endOfStreamMessage));
    }
}

module.exports = {
    setupAudioListener,
    handleAudioStream,
    playNextAudio,
    stopAudio,
    sendAudioChunk
};
