# PolyChat – Multi-LLM Chat Application

PolyChat is an intelligent chat application that allows users to interact with multiple Large Language Models (LLMs) through a single interface. Inspired by tools like Perplexity AI, PolyChat enables flexible AI interactions by allowing users to switch between different LLMs during a conversation.

This project was built as part of the **Web Development Task for Coding Club – IIT Guwahati Coding Week**.

---

## 🚀 Features

### Core Features (Task 1)

* Modern Chat Interface

  * Landing page with model selection
  * Chat conversation interface

* Multi-LLM Support

  * OpenAI
  * Google Gemini
  * Anthropic Claude

* Manual Model Switching

  * Users can change the LLM during an ongoing conversation
  * Previous chat context is preserved

* LLM API Integration

  * Backend handles requests to different LLM APIs
  * Responses clearly indicate which model generated them

---

### Advanced Features (Task 2 – Optional)

* Automatic Model Switching

  * System automatically selects the most suitable LLM based on query context

* Chat History Persistence

  * MongoDB Atlas stores conversation history

* Context Retention

  * Switching models does not lose conversation context

---

## 🛠 Tech Stack

Frontend

* React / HTML / CSS / JavaScript

Backend

* Node.js
* Express.js

Database

* MongoDB Atlas

APIs

* OpenAI API
* Google Gemini API
* Anthropic Claude API

---

## 📂 Project Structure

```
PolyChat
│
├── frontend
│   ├── components
│   ├── pages
│   └── styles
│
├── backend
│   ├── api
│   │   ├── controller.js
│   │   ├── model.js
│   │   └── routes.js
│   │
│   └── server.js
│
├── .env
├── package.json
└── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```
git clone https://github.com/yourusername/polychat.git
cd polychat
```

---

### 2️⃣ Install Dependencies

Backend

```
cd backend
npm install
```

Frontend

```
cd frontend
npm install
```

---

### 3️⃣ Configure Environment Variables

Create a `.env` file in the backend directory.

```
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
CLAUDE_API_KEY=your_claude_key
MONGODB_URI=your_mongodb_connection_string
```

---

### 4️⃣ Run the Application

Start backend

```
npm start
```

Start frontend

```
npm run dev
```

---

## 🧠 How It Works

1. User selects an LLM model from the interface.
2. The prompt is sent to the backend API.
3. The backend routes the request to the selected LLM.
4. The response is returned and displayed in the chat UI.
5. If the model is switched, conversation history is sent to the new model to maintain context.

---

## 📸 Screens

* Landing Screen (Model Selection)
* Chat Conversation Screen




