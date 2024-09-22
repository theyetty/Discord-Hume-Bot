const { MAX_CONTEXT_LENGTH } = require('./constants');

let conversationContext = [];

function addToContext(speaker, message) {
    conversationContext.push({ speaker, message });
    if (conversationContext.length > MAX_CONTEXT_LENGTH) {
        conversationContext.shift();
    }
}

function getContext() {
    return conversationContext;
}

module.exports = { addToContext, getContext };
