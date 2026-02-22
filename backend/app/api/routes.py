from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Header
from pydantic import BaseModel
from app.modules.orchestrator import orchestrator
from app.models.response_model import UnifiedResponse
from app.auth.supabase_guard import get_current_user
from app.repositories.chat_repository import chat_repo
from typing import Optional

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    save_to_history: bool = True  # Set False for data-fetch calls (Dashboard, ArgoExplorer)

from fastapi.responses import StreamingResponse
import json

from app.utils.title_generator import generate_title

@router.post("/query")
async def handle_query(
    request: QueryRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    authorization: str = Header(None)
):
    """
    Primary endpoint for handling user oceanographic queries with Streaming Response (SSE).
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    user_id = user["id"]
    session_id = request.session_id
    
    # Create a user-scoped client for DB operations to respect RLS
    # We strip "Bearer " if present
    token = authorization.split(" ")[1] if authorization and " " in authorization else ""
    user_client = None
    if token:
        try:
            from app.integrations.supabase_client import supabase_integration
            user_client = supabase_integration.get_client_for_user(token)
        except Exception:
            pass # Fallback to default or fail gracefully

    # 1. Manage Session (only for real chat interactions, not data-fetch calls)
    if not session_id and request.save_to_history:
        title = generate_title(request.query)
        try:
            from fastapi.concurrency import run_in_threadpool
            session_id = await run_in_threadpool(chat_repo.create_session, user_id, title, user_client)
        except Exception as e:
            print(f"Session creation failed: {e}")
            session_id = None
    
    # 2. Store User Message (Synchronous/Awaited for Persistence)
    if session_id:
        try:
            from fastapi.concurrency import run_in_threadpool
            # Save user message immediately so it exists in DB before we process and reply
            await run_in_threadpool(chat_repo.save_message, session_id, "user", request.query, None, user_client)
        except Exception as e:
            print(f"Failed to save user message: {e}")
            
        # Check and update title if needed (background is fine for this)
        
        # Check and update title if needed (for sessions created by frontend with "New Chat" or placeholder)
        async def check_and_update_title(sid, uid, message, client):
            try:
                current_title = chat_repo.get_session_title(sid, client)
                if not current_title or current_title == "New Chat":
                    new_title = generate_title(message)
                    chat_repo.update_session_title(sid, uid, new_title, client)
            except Exception as e:
                print(f"Title update failed: {e}")

        background_tasks.add_task(check_and_update_title, session_id, user_id, request.query, user_client)

    # 3. Retrieve Context
    context_messages = []
    if session_id:
        try:
            from fastapi.concurrency import run_in_threadpool
            context_messages = await run_in_threadpool(chat_repo.get_recent_messages, session_id, 5, user_client)
        except Exception as e:
            print(f"Context retrieval failed: {e}")
            context_messages = []

    async def response_generator():
        full_response_text = ""
        # Yield session_id as first metadata event if new session
        if not request.session_id and session_id:
             yield f"event: session\ndata: {json.dumps({'session_id': session_id})}\n\n"

        try:
            # Extract content context - Pass list of dicts for LLM
            # Ensure we only pass role and content to avoid clutter or errors
            clean_context = [
                {"role": msg.get("role", "user"), "content": msg.get("content", "")} 
                for msg in context_messages 
                if msg.get("content")
            ]
            
            # Accumulate text for saving
            visualization_data = None
            
            async for event in orchestrator.stream_query(request.query, context=clean_context):
                lines = event.split('\n')
                event_type = ""
                data = ""
                for line in lines:
                    if line.startswith("event:"):
                        event_type = line.split(":", 1)[1].strip()
                    if line.startswith("data:"):
                        # data might span multiple lines but split logic here is simple for streams
                        # usually json dumps doesn't include newlines in data payload
                        data = line.split(":", 1)[1].strip()
                
                if event_type == "chunk":
                    try:
                        chunk_text = json.loads(data)
                        full_response_text += chunk_text
                    except:
                        pass
                elif event_type == "visualization":
                    try:
                         visualization_data = json.loads(data)
                    except:
                         pass
                
                yield event
            
            # Save final message
            if session_id:
                 from fastapi.concurrency import run_in_threadpool
                 meta = {"visualization": visualization_data} if visualization_data else None
                 await run_in_threadpool(chat_repo.save_message, session_id, "assistant", full_response_text.strip(), meta, user_client)
                 
        except Exception as e:
            print(f"Streaming Error: {e}")
            yield f"event: error\ndata: {json.dumps(str(e))}\n\n"

    return StreamingResponse(response_generator(), media_type="text/event-stream")


class RenameRequest(BaseModel):
    title: str

@router.delete("/sessions/{session_id}")
async def delete_session_endpoint(
    session_id: str,
    user: dict = Depends(get_current_user),
    authorization: str = Header(None)
):
    """
    Delete a chat session.
    """
    token = authorization.split(" ")[1] if authorization and " " in authorization else ""
    user_client = None
    if token:
        try:
            from app.integrations.supabase_client import supabase_integration
            user_client = supabase_integration.get_client_for_user(token)
        except Exception:
            pass

    success = chat_repo.delete_session(session_id, user["id"], user_client)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete session")
    return {"status": "success", "id": session_id}

@router.patch("/sessions/{session_id}")
async def rename_session_endpoint(
    session_id: str,
    request: RenameRequest,
    user: dict = Depends(get_current_user),
    authorization: str = Header(None)
):
    """
    Rename a chat session.
    """
    if not request.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")

    token = authorization.split(" ")[1] if authorization and " " in authorization else ""
    user_client = None
    if token:
        try:
            from app.integrations.supabase_client import supabase_integration
            user_client = supabase_integration.get_client_for_user(token)
        except Exception:
            pass

    success = chat_repo.update_session_title(session_id, user["id"], request.title, user_client)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to rename session")
    return {"status": "success", "id": session_id, "title": request.title}



@router.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring uptime.
    """
    return {"status": "active", "service": "Neel Drishti Backend"}
