
MAX_CONTEXT_LENGTH = 1280;
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
