const { log } = require('./utils');

const MAX_CONTEXT_LENGTH = 1280;
let conversationContext = {
    text: ''
};

function addToContext(speaker, message) {
    const newEntry = `${speaker}: ${message}\n`;
    conversationContext.text += newEntry;
    
    // Log the message only once, here
    log(`${speaker}: ${message}`);
    
    // Trim the context if it exceeds MAX_CONTEXT_LENGTH
    if (conversationContext.text.length > MAX_CONTEXT_LENGTH) {
        const excessLength = conversationContext.text.length - MAX_CONTEXT_LENGTH;
        conversationContext.text = conversationContext.text.slice(excessLength);
    }
}

function getContext() {
    return conversationContext;
}

module.exports = { addToContext, getContext };
