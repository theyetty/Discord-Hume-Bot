let humeSocket = null;
let botMessageBuffer = [];
let audioQueue = [];
let isPlaying = false;
let isConnecting = false;
let isWaitingForEnd = false;
let lastSentMessage = null;
let conversationContext = '';

module.exports = {
    get humeSocket() { return humeSocket; },
    set humeSocket(value) { humeSocket = value; },
    get botMessageBuffer() { return botMessageBuffer; },
    set botMessageBuffer(value) { botMessageBuffer = value; },
    get audioQueue() { return audioQueue; },
    set audioQueue(value) { audioQueue = value; },
    get isPlaying() { return isPlaying; },
    set isPlaying(value) { isPlaying = value; },
    get isConnecting() { return isConnecting; },
    set isConnecting(value) { isConnecting = value; },
    get isWaitingForEnd() { return isWaitingForEnd; },
    set isWaitingForEnd(value) { isWaitingForEnd = value; },
    get lastSentMessage() { return lastSentMessage; },
    set lastSentMessage(value) { lastSentMessage = value; },
};