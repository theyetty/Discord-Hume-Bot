function getTimestamp() {
    return new Date().toISOString();
}

function log(message) {
    console.log(`[${getTimestamp()}] ${message}`);
}

function startPing(socket) {
    setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.ping();
        }
    }, 30000); // Every 30 seconds
}

module.exports = { getTimestamp, log, startPing };
