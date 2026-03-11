const url = 'http://localhost:3001/api';//sends request to backend server  address
let selectedModel = 'gpt-4o';
let messages = [];

if(document.getElementById('userInput')) {
    
    let buttons = document.querySelectorAll('.model-btn');
    for(let i=0; i<buttons.length; i++) {
        buttons[i].addEventListener('click', function() {
            for(let j=0; j<buttons.length; j++) {
                buttons[j].classList.remove('active');
            }
            this.classList.add('active');
            selectedModel = this.dataset.model;
        });
    }

    document.getElementById('sendBtn').addEventListener('click', function() {
        let input = document.getElementById('userInput');
        let text = input.value.trim();
        if(text) {
            sessionStorage.setItem('msg', text);
            sessionStorage.setItem('model', selectedModel);
            window.location.href = 'screen2.html';
        }
    });

    document.getElementById('userInput').addEventListener('keypress', function(e) {
        if(e.key === 'Enter') {
            document.getElementById('sendBtn').click();
        }
    });

    document.querySelector('.new-chat-btn').addEventListener('click', function() {
        document.getElementById('userInput').value = '';
    });
}

if(document.getElementById('chatInput')) {
    
    let msg = sessionStorage.getItem('msg');
    let model = sessionStorage.getItem('model');
    
    if(model) {
        selectedModel = model;
        document.getElementById('modelDropdown').value = model;
    }
    
    if(msg) {
        sessionStorage.removeItem('msg');
        sendMsg(msg);
    }

    document.getElementById('modelDropdown').addEventListener('change', function(e) {
        selectedModel = e.target.value;
    });

    document.getElementById('sendBtnChat').addEventListener('click', function() {
        let input = document.getElementById('chatInput');
        let text = input.value.trim();
        if(text) {
            input.value = '';
            sendMsg(text);
        }
    });

    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if(e.key === 'Enter') {
             document.getElementById('sendBtnChat').click();
        }
    });

    document.getElementById('newChatBtn').addEventListener('click', function() {
        window.location.href = 'screen1.html';
    });
}

async function sendMsg(text) {
    
    showMsg(text, 'user');
    messages.push({ role: 'user', content: text });

    let loadId = 'load' + Date.now();
    showMsg('Thinking...', 'loading', null, loadId);

    try {
        let resp = await fetch(url + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                prompt: text,
                chatHistory: messages.slice(0, -1)
            })
        });

        let data = await resp.json();

        let elem = document.getElementById(loadId);
        if(elem) elem.remove();

        showMsg(data.response, 'assistant', data.model);
        messages.push({ role: 'assistant', content: data.response });

    } catch(err) {
        let elem = document.getElementById(loadId);
        if(elem) elem.remove();
        showMsg('Error: ' + err.message, 'assistant');
    }
}

function formatText(text) {
    let formatted = text;
    
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    formatted = formatted.replace(/\* (.*?)(\n|$)/g, '• $1<br>');
    
    let lines = formatted.split('\n');
    let result = '';
    for(let i=0; i<lines.length; i++) {
        let line = lines[i];
        
        if(line.match(/^#{1,3} /)) {
            line = line.replace(/^### /, '<h3>');
            line = line.replace(/^## /, '<h2>');
            line = line.replace(/^# /, '<h1>');
            line = line + (line.includes('<h') ? '</h3>' : '');
            line = line.replace('</h3>', line.includes('<h1>') ? '</h1>' : (line.includes('<h2>') ? '</h2>' : '</h3>'));
        }
        
        if(line.match(/^\d+\. /)) {
            line = line.replace(/^\d+\. /, '');
            line = '<div class="num-item">' + line + '</div>';
        }
        
        result += line + '<br>';
    }
    
    return result;
}

function showMsg(text, type, model, id) {
    let container = document.getElementById('messagesContainer');
    let div = document.createElement('div');
    div.className = 'msg-group ' + type + '-msg-group';
    if(id) div.id = id;

    let html = '';
    if(model) {
        html += '<div class="model-label">' + model.toUpperCase() + '</div>';
    }
    
    let content = text;
    if(type === 'assistant') {
        content = formatText(text);
    }
    
    html += '<div class="msg-box ' + type + '-msg">' + content + '</div>';
    
    div.innerHTML = html;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}
