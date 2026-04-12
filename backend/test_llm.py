import os
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
from typing import TypedDict,List,Optional
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import uuid

app_api = FastAPI()
sessions = {}

# Add CORS middleware
app_api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load env
load_dotenv()

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
        bot_reply = response.content

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
app = graph.compile()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

@app_api.post("/chat")
def chat(request: ChatRequest):

    # Generate session_id if not provided
    if not request.session_id:
        session_id = str(uuid.uuid4())
    else:
        session_id = request.session_id

    history = sessions.get(session_id, [])

    state = {
        "input": request.message,
        "history": history
    }

    result = app.invoke(state)
    sessions[session_id] = result["history"]

    return {
        "response": result["output"],
        "session_id": session_id   # 👈 IMPORTANT
    }
