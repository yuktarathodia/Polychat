// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = 'http://localhost:3001/api';

// Global State
let currentModel = 'gpt-4o';
let chatHistory = [];
let conversationId = null;
let isLoading = false;
let conversations = [];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getModelColor(model) {
    const colors = {
        'gpt-4o': '#10a37f',
        'gemini-2.5': '#4285f4',
        'cohere': '#ff6b6b'
    };
    return colors[model] || '#6e7681';
}

function getModelDisplayName(model) {
    const names = {
        'gpt-4o': 'GPT-4o',
        'gemini-2.5': 'Gemini 2.5',
        'cohere': 'Cohere'
    };
    return names[model] || model;
}

// function formatMarkdown(text) {
//     let html = text
//         .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
//         .replace(/\n\n/g, '</p><p>')
//         .replace(/\n/g, '<br>');
    
//     return `<p>${html}</p>`;
// }
function formatMarkdown(text) {
    if (typeof marked !== 'undefined') {
        // Configure marked for better rendering
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });
        return marked.parse(text);
    }
    
    // Fallback if marked.js not loaded
    return text.replace(/\n/g, '<br>');
}
// ============================================
// MESSAGE DISPLAY FUNCTIONS (GLOBAL)
// ============================================

function displayMessage(content, role, model = null) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    const messageGroup = document.createElement('div');
    messageGroup.className = `message-group ${role}-message-group`;
    
    if (role === 'assistant' && model !== 'error') {
        const modelIndicator = document.createElement('div');
        modelIndicator.className = 'model-indicator';
        
        const actualModel = model || currentModel;
        const modelColor = getModelColor(actualModel);
        const modelName = getModelDisplayName(actualModel);
        
        modelIndicator.innerHTML = `
            <div class="model-badge" style="background-color: ${modelColor}">
                <svg width="14" height="14" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="6" fill="white"/>
                </svg>
                <span>${modelName}</span>
            </div>
        `;
        messageGroup.appendChild(modelIndicator);
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = `message-content ${role}-message`;
    
    if (role === 'user') {
        messageContent.textContent = content;
    } else {
        messageContent.innerHTML = formatMarkdown(content);
    }
    
    messageGroup.appendChild(messageContent);
    messagesContainer.appendChild(messageGroup);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showLoading() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return null;

    const loadingId = `loading-${Date.now()}`;
    const loadingGroup = document.createElement('div');
    loadingGroup.className = 'message-group assistant-message-group';
    loadingGroup.id = loadingId;
    
    loadingGroup.innerHTML = `
        <div class="loading-indicator">
            <div class="loading-dots">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(loadingGroup);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return loadingId;
}

function removeLoading(loadingId) {
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

// ============================================
// CONVERSATION HISTORY (Task 2)
// ============================================

async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations`);
        if (!response.ok) throw new Error('Failed to load conversations');
        
        const data = await response.json();
        conversations = data.conversations;
        
        displayConversations();
        
        console.log(`✓ Loaded ${conversations.length} conversations`);
        
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

function displayConversations() {
    const chatHistoryContainer = document.querySelector('.chat-history');
    if (!chatHistoryContainer) return;

    if (conversations.length === 0) {
        chatHistoryContainer.innerHTML = '<div class="chat-item empty">No conversations yet</div>';
        return;
    }

    chatHistoryContainer.innerHTML = conversations.map(conv => {
        const isActive = conv._id === conversationId;
        return `
            <div class="chat-item ${isActive ? 'active' : ''}" data-id="${conv._id}">
                <div class="chat-item-content">
                    <div class="chat-item-title">${conv.title}</div>
                    <div class="chat-item-meta">${conv.messageCount || 0} messages</div>
                </div>
                <button class="chat-item-delete" data-id="${conv._id}" title="Delete conversation">
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path d="M5.5 5.5v7m2.5-7v7m2.5-7v7M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M4 4h8v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" 
                              stroke="currentColor" stroke-width="1.5" fill="none"/>
                    </svg>
                </button>
            </div>
        `;
    }).join('');

    // Add click handlers for chat items
    const chatItems = chatHistoryContainer.querySelectorAll('.chat-item:not(.empty)');
    chatItems.forEach(item => {
        const convId = item.getAttribute('data-id');
        if (convId) {
            // Click on item content to load conversation
            const itemContent = item.querySelector('.chat-item-content');
            if (itemContent) {
                itemContent.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Clicked conversation:', convId);
                    loadConversation(convId);
                });
            }

            // Click on delete button to delete conversation
            const deleteBtn = item.querySelector('.chat-item-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Delete conversation:', convId);
                    deleteConversation(convId);
                });
            }
        }
    });
}

async function loadConversation(convId) {
    try {
        console.log('Loading conversation:', convId);

        // If not on screen2, navigate there first
        if (!document.getElementById('messagesContainer')) {
            console.log('Navigating to screen2...');
            sessionStorage.setItem('loadConversationId', convId);
            window.location.href = 'screen2.html';
            return;
        }

        // Fetch conversation from backend
        const response = await fetch(`${API_BASE_URL}/conversations/${convId}`);
        if (!response.ok) {
            throw new Error('Failed to load conversation');
        }
        
        const data = await response.json();
        console.log('Conversation data:', data);
        
        // Clear current state
        conversationId = convId;
        chatHistory = [];
        
        // Update title
        const chatTitle = document.getElementById('chatTitle');
        if (chatTitle) {
            chatTitle.textContent = data.conversation.title;
        }
        
        // Clear messages container
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // Display all messages
        if (data.messages && data.messages.length > 0) {
            console.log(`Displaying ${data.messages.length} messages`);
            data.messages.forEach(msg => {
                displayMessage(msg.content, msg.role, msg.model);
                chatHistory.push({
                    role: msg.role,
                    content: msg.content
                });
            });
        } else {
            console.log('No messages found');
        }
        
        // Update active state in sidebar
        displayConversations();
        
        console.log(`✓ Loaded conversation: ${data.conversation.title}`);
        
    } catch (error) {
        console.error('Error loading conversation:', error);
        alert(`Error loading conversation: ${error.message}`);
    }
}

async function deleteConversation(convId) {
    try {
        // Confirm deletion
        const conv = conversations.find(c => c._id === convId);
        const confirmMsg = conv 
            ? `Delete "${conv.title}"?`
            : 'Delete this conversation?';
        
        if (!confirm(confirmMsg)) {
            return;
        }

        console.log('Deleting conversation:', convId);

        // Call delete API
        const response = await fetch(`${API_BASE_URL}/conversations/${convId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete conversation');
        }

        console.log('✓ Conversation deleted');

        // If deleting the active conversation, clear screen
        if (convId === conversationId) {
            conversationId = null;
            chatHistory = [];
            
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
            }
            
            const chatTitle = document.getElementById('chatTitle');
            if (chatTitle) {
                chatTitle.textContent = 'New Conversation';
            }
        }

        // Reload conversations
        await loadConversations();

    } catch (error) {
        console.error('Error deleting conversation:', error);
        alert(`Error deleting conversation: ${error.message}`);
    }
}

// ============================================
// SCREEN 1 - LANDING PAGE
// ============================================

function initScreen1() {
    const modelButtons = document.querySelectorAll('.model-btn');
    const searchInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const actionButtons = document.querySelectorAll('.action-btn');
    const newChatBtn = document.querySelector('.new-chat-btn');

    if (!modelButtons.length) return;

    console.log('Initializing Screen 1');

    // Load conversations in sidebar
    loadConversations();

    // Load saved model
    const savedModel = localStorage.getItem('selectedModel') || 'gpt-4o';
    currentModel = savedModel;
    updateModelSelection(savedModel);

    // Model selection
    modelButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const model = btn.getAttribute('data-model');
            currentModel = model;
            localStorage.setItem('selectedModel', model);
            updateModelSelection(model);
        });
    });

    // Send message
    sendBtn?.addEventListener('click', handleSendFromScreen1);
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendFromScreen1();
        }
    });

    // Quick actions
    actionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            const prompts = {
                'summarize': 'Help me summarize ',
                'code': 'Help me write code for ',
                'brainstorm': 'Help me brainstorm ideas about ',
                'analyze': 'Help me analyze data for '
            };
            searchInput.value = prompts[action] || '';
            searchInput.focus();
        });
    });

    // New chat
    newChatBtn?.addEventListener('click', () => {
        conversationId = null;
        chatHistory = [];
        searchInput.value = '';
        sessionStorage.removeItem('loadConversationId');
        displayConversations();
    });

    function updateModelSelection(model) {
        modelButtons.forEach(btn => {
            if (btn.getAttribute('data-model') === model) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function handleSendFromScreen1() {
        const prompt = searchInput.value.trim();
        if (!prompt) return;

        sessionStorage.setItem('initialPrompt', prompt);
        sessionStorage.setItem('selectedModel', currentModel);
        sessionStorage.removeItem('loadConversationId');
        
        window.location.href = 'screen2.html';
    }
}

// ============================================
// SCREEN 2 - CHAT INTERFACE
// ============================================

function initScreen2() {
    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtnChat');
    const currentModelBtn = document.getElementById('currentModelBtn');
    const modelDropdown = document.getElementById('modelDropdown');
    const currentModelName = document.getElementById('currentModelName');
    const chatTitle = document.getElementById('chatTitle');
    const newChatBtn = document.getElementById('newChatBtn');
    const regenerateBtn = document.getElementById('regenerateBtn');

    if (!messagesContainer) return;

    console.log('Initializing Screen 2');

    // Load conversations in sidebar
    loadConversations();

    // Initialize
    currentModel = sessionStorage.getItem('selectedModel') || 'gpt-4o';
    updateCurrentModelDisplay();

    // Check if loading existing conversation (PRIORITY)
    const loadConvId = sessionStorage.getItem('loadConversationId');
    if (loadConvId) {
        console.log('Found conversation to load:', loadConvId);
        sessionStorage.removeItem('loadConversationId');
        setTimeout(() => {
            loadConversation(loadConvId);
        }, 100);
    } else {
        // Load initial prompt if coming from screen1
        const initialPrompt = sessionStorage.getItem('initialPrompt');
        if (initialPrompt) {
            console.log('Found initial prompt:', initialPrompt);
            sessionStorage.removeItem('initialPrompt');
            sendMessage(initialPrompt);
        }
    }

    // Send message
    sendBtn?.addEventListener('click', () => sendMessage(chatInput.value));
    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(chatInput.value);
        }
    });

    // Auto-resize textarea
    chatInput?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // Model dropdown toggle
    currentModelBtn?.addEventListener('click', () => {
        modelDropdown.classList.toggle('show');
        currentModelBtn.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!currentModelBtn?.contains(e.target) && !modelDropdown?.contains(e.target)) {
            modelDropdown?.classList.remove('show');
            currentModelBtn?.classList.remove('active');
        }
    });

    // Model selection from dropdown
    const modelOptions = document.querySelectorAll('.model-option');
    modelOptions.forEach(option => {
        option.addEventListener('click', () => {
            const newModel = option.getAttribute('data-model');
            currentModel = newModel;
            updateCurrentModelDisplay();
            modelDropdown.classList.remove('show');
            currentModelBtn.classList.remove('active');
            
            console.log(`Switched to ${getModelDisplayName(newModel)}`);
        });
    });

    // New chat
    newChatBtn?.addEventListener('click', () => {
        conversationId = null;
        chatHistory = [];
        messagesContainer.innerHTML = '';
        chatInput.value = '';
        chatTitle.textContent = 'New Conversation';
        sessionStorage.removeItem('loadConversationId');
        window.location.href = 'screen1.html';
    });

    // Regenerate last response
    regenerateBtn?.addEventListener('click', () => {
        if (chatHistory.length >= 2) {
            const lastUserMessage = chatHistory[chatHistory.length - 2];
            chatHistory = chatHistory.slice(0, -2);
            
            const messages = messagesContainer.querySelectorAll('.message-group');
            if (messages.length >= 2) {
                messages[messages.length - 1].remove();
                messages[messages.length - 2].remove();
            }
            
            sendMessage(lastUserMessage.content);
        }
    });

    function updateCurrentModelDisplay() {
        const modelName = getModelDisplayName(currentModel);
        const modelColor = getModelColor(currentModel);
        
        if (currentModelName) {
            currentModelName.textContent = modelName;
        }
        
        const iconCircle = currentModelBtn?.querySelector('circle');
        if (iconCircle) {
            iconCircle.setAttribute('fill', modelColor);
        }
    }

    async function sendMessage(prompt) {
        if (!prompt || !prompt.trim() || isLoading) return;
        
        const userMessage = prompt.trim();
        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        displayMessage(userMessage, 'user');
        
        chatHistory.push({
            role: 'user',
            content: userMessage
        });
        
        if (chatHistory.length === 1) {
            const title = userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '');
            chatTitle.textContent = title;
        }
        
        const loadingId = showLoading();
        isLoading = true;
        
        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: currentModel,
                    prompt: userMessage,
                    chatHistory: chatHistory.slice(0, -1),
                    conversationId: conversationId
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'API request failed');
            }
            
            const data = await response.json();
            
            removeLoading(loadingId);
            isLoading = false;
            
            displayMessage(data.response, 'assistant', data.model);
            
            chatHistory.push({
                role: 'assistant',
                content: data.response
            });
            
            if (data.conversationId) {
                conversationId = data.conversationId;
                await loadConversations();
            }
            
            console.log(`✓ Response received from ${getModelDisplayName(data.model)}`);
            
        } catch (error) {
            console.error('Error sending message:', error);
            removeLoading(loadingId);
            isLoading = false;
            
            displayMessage(
                `⚠️ Error: ${error.message}. Please check your backend connection.`,
                'assistant',
                'error'
            );
        }
    }
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('PolyChat loaded');
    console.log('API URL:', API_BASE_URL);
    
    initScreen1();
    initScreen2();
});
