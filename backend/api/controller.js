const OpenAI = require('openai'); //allows backend to talk to ai models
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { CohereClient } = require('cohere-ai');

const client1 = process.env.GITHUB_TOKEN ? new OpenAI({
    baseURL: 'https://models.inference.ai.azure.com',
    apiKey: process.env.GITHUB_TOKEN
}) : null;

const client2 = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const client3 = process.env.COHERE_API_KEY ? new CohereClient({ token: process.env.COHERE_API_KEY }) : null;

function formatHistory1(hist) {
    let arr = []; //empty array for storing the msg
    for(let i=0; i<hist.length; i++) {
        if(hist[i].content) {
            arr.push({  //adding content in the array
                role: hist[i].role,
                content: hist[i].content
            });
        }
    }
    return arr;
}

function formatHistory2(hist) {
    let arr = [];
    for(let i=0; i<hist.length; i++) {
        if(hist[i].content) {
            let r = hist[i].role === 'assistant' ? 'model' : 'user';
            arr.push({
                role: r,
                parts: [{ text: hist[i].content }]
            });
        }
    }
    return arr;
}

function formatHistory3(hist) {
    let arr = [];
    for(let i=0; i<hist.length; i++) {
        if(hist[i].content) {
            let r = hist[i].role === 'assistant' ? 'CHATBOT' : 'USER';
            arr.push({
                role: r,
                message: hist[i].content
            });
        }
    }
    return arr;
}

async function callModel1(msg, hist) { //call model parameter me new msg and history lega
    let messages = formatHistory1(hist); //message me formatted history store hogi
    messages.push({ role: 'user', content: msg });

    let result = await client1.chat.completions.create({ //client 1 is selected,,,ask openai to generate reply
        model: 'gpt-4o-mini',                            //pause here until ai responds
        messages: messages,
        temperature: 0.7,
        max_tokens: 3000
    });

    return result.choices[0].message.content;  //return ai reply only
}

async function callModel2(msg, hist) {
    let m = client2.getGenerativeModel({ model: 'gemini-2.5-flash' }); //choosing models
    let h = formatHistory2(hist); //formatted history
    let chat = m.startChat({  //starting new chat
        history: h,           //h is stored in history
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 3000,
        }
    });
    let res = await chat.sendMessage(msg); //programmer will wait till the gemini replies
    return res.response.text();
}

async function callModel3(msg, hist) {
    let h = formatHistory3(hist);
    let res = await client3.chat({
        model: 'command-a-03-2025',
        message: msg,
        chatHistory: h,
        temperature: 0.7,
        maxTokens: 3000
    });
    return res.text;
}

//recieves request from frontend
//decides which ai model to use
//sends user message+history to ai
//sends back the ai reply to the frontend

async function handleChat(req, res) { //request from frontend and response sent back to frontend
    try {
        let modelName = req.body.model;
        let userMsg = req.body.prompt;
        let history = req.body.chatHistory;

        if(!modelName || !userMsg) {  //if model name and usermsg both do not exist then error
            return res.status(400).json({ error: 'missing data' });
        }

        if(!userMsg.trim()) {
            return res.status(400).json({ error: 'empty message' });
        }

        console.log('Chat request: ' + modelName);

        let answer;
        let h = history || [];

        if(modelName === 'gpt-4o') {
            if(!client1) {
                throw new Error('GPT not setup'); //goes to catch
            }
            answer = await callModel1(userMsg, h); //()
        } else if(modelName === 'gemini-2.5') {
            if(!client2) {
                throw new Error('Gemini not setup'); //goes to catch
            }
            answer = await callModel2(userMsg, h);
        } else if(modelName === 'cohere') {
            if(!client3) {
                throw new Error('Cohere not setup'); //goes to catch
            }
            answer = await callModel3(userMsg, h);
        } else {
            return res.status(400).json({ error: 'wrong model' });
        }

        res.json({
            response: answer, //ai response
            model: modelName, //which ai model answered 
            timestamp: new Date().toISOString() //when
        });

    } catch(err) {
        console.log('Error: ' + err.message);
        res.status(500).json({ error: err.message });
    }
}

function getModelsStatus(req, res) {
    let data = {
        models: {
            'gpt-4o': { available: !!client1 }, //!!-->converts value into true false
            'gemini-2.5': { available: !!client2 },
            'cohere': { available: !!client3 }
        }
    };
    res.json(data); //send model status to frontend
}

module.exports = { //export controller functions so that route.js can use it
    handleChat,
    getModelsStatus
};
