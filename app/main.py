import os
from dotenv import load_dotenv
from typing import TypedDict,List,Optional
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import uuid

app = FastAPI()
sessions = {}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load env
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, ".env"))

# Initialize Gemini
model = ChatGoogleGenerativeAI(
    model="gemini-flash-latest",
    google_api_key=os.getenv("GOOGLE_API_KEY"), # Optional if loaded via load_dotenv()
)

# Define state schema
class ChatState(TypedDict):
    input: str
    output: str
    history: List[str]

# Node: LLM call
def chatbot_node(state):
    try:
        user_input = state.get("input")
        history = state.get("history", [])

        if not user_input:
            return {"output": "No input provided", "history": history}

        # Add user input to history
        history.append(f"User: {user_input}")

        prompt = "\n".join(history)

        # Use model.invoke with the string directly
        response = model.invoke(prompt)
        
        # Ensure bot_reply is a string
        if isinstance(response.content, str):
            bot_reply = response.content
        elif isinstance(response.content, list):
            # Handle cases where content is a list of parts (e.g. Gemini multi-modal)
            bot_reply = "".join([part.get("text", "") if isinstance(part, dict) else str(part) for part in response.content])
        else:
            bot_reply = str(response.content)

        # Add bot reply to history
        history.append(f"Bot: {bot_reply}")

        return {"output": bot_reply, "history": history}

    except Exception as e:
        print("ERROR:", e)   # 👈 VERY IMPORTANT
        return {"output": "Something went wrong"}

# Build graph
graph = StateGraph(ChatState)
graph.add_node("chatbot", chatbot_node)
graph.set_entry_point("chatbot")
graph.add_edge("chatbot", END)

# Compile
chat_workflow = graph.compile()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

@app.post("/chat")
def chat(request: ChatRequest):

    # Generate session_id if not provided
    if not request.session_id:
        session_id = str(uuid.uuid4())
    else:
        session_id = request.session_id

    session_data  = sessions.get(session_id)

    if not session_data:
        # First message → create new session
        session_data = {
            "title": request.message[:30],  # first message as title
            "history": []
        }

    history = session_data["history"]
    

    state = {
        "input": request.message,
        "history": history
    }

    result = chat_workflow.invoke(state)
    session_data["history"] = result["history"]
    sessions[session_id] = session_data

    return {
        "response": result["output"],
        "session_id": session_id   # 👈 IMPORTANT
    }



@app.get("/sessions")
def get_sessions():
    return [
        {
            "session_id": sid,
            "title": data["title"]
        }
        for sid, data in sessions.items()
    ]

@app.get("/sessions/{session_id}")
def get_session(session_id: str):
    session = sessions.get(session_id)

    if not session:
        return {"error": "Session not found"}

    return session

@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    if session_id in sessions:
        del sessions[session_id]
        return {"message": "Deleted"}
    return {"error": "Not found"}

# Alias for Render compatibility
app_api = app