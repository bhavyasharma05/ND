from datetime import datetime
from typing import List, Optional, Dict
from app.integrations.supabase_client import supabase_integration
import logging

logger = logging.getLogger(__name__)

class ChatRepository:
    def __init__(self):
        self._supabase = supabase_integration

    def create_session(self, user_id: str, title: str, client=None) -> Optional[str]:
        """
        Creates a new chat session and returns session_id.
        """
        try:
            curr_client = client if client else self._supabase.get_client()
            data = {
                "user_id": user_id,
                "title": title
            }
            # 'returning="representation"' is default in new supabase-py
            response = curr_client.table("chat_sessions").insert(data).execute()
            if response.data:
                return response.data[0]["id"]
            return None
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            return None

    def get_recent_messages(self, session_id: str, limit: int = 20, client=None) -> List[Dict]:
        """
        Retrieves last N messages for context.
        """
        try:
            curr_client = client if client else self._supabase.get_client()
            # We want messages from this session, ordered by creaetd_at DESC, limit N
            # Then reverse to get chronological order for LLM context
            response = curr_client.table("messages")\
                .select("*")\
                .eq("session_id", session_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            data = response.data or []
            return sorted(data, key=lambda x: x["created_at"]) # Return chronological
        except Exception as e:
            logger.error(f"Error fetching messages: {e}")
            return []

    def save_message(self, session_id: str, role: str, content: str, meta: Optional[Dict] = None, client=None) -> Optional[dict]:
        """
        Stores user or assistant message.
        """
        try:
            curr_client = client if client else self._supabase.get_client()
            data = {
                "session_id": session_id,
                "role": role,
                "content": content
            }
            if meta:
                data["meta"] = meta
            response = curr_client.table("messages").insert(data).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error saving message: {e}")
            return None
            
    def get_user_sessions(self, user_id: str, limit: int = 50, client=None) -> List[Dict]:
        """
        List all sessions for a user.
        """
        try:
            curr_client = client if client else self._supabase.get_client()
            response = curr_client.table("chat_sessions")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error fetching user sessions: {e}")
            return []

    def delete_session(self, session_id: str, user_id: str, client=None) -> bool:
        """
        Delete a session.
        Uses the provided authenticated client to respect RLS policies (once added).
        """
        try:
            curr_client = client if client else self._supabase.get_client()
            logger.info(f"Attempting to delete session {session_id} for user {user_id}")
            
            response = curr_client.table("chat_sessions")\
                .delete()\
                .eq("id", session_id)\
                .eq("user_id", user_id)\
                .execute()
            
            logger.info(f"Delete response: {response}")
            if response.data:
                 logger.info(f"Successfully deleted {len(response.data)} rows.")
                 return True
            else:
                 logger.warning(f"No rows deleted for session {session_id}. Check RLS policies.")
                 return False

        except Exception as e:
            logger.error(f"Error deleting session: {e}", exc_info=True)
            return False

    def update_session_title(self, session_id: str, user_id: str, title: str, client=None) -> bool:
        """
        Rename a session.
        """
        try:
            curr_client = client if client else self._supabase.get_client()
            logger.info(f"Attempting to rename session {session_id} for user {user_id} to '{title}'")
            
            response = curr_client.table("chat_sessions")\
                .update({"title": title})\
                .eq("id", session_id)\
                .eq("user_id", user_id)\
                .execute()
            
            logger.info(f"Update response: {response}")
            if response.data:
                 return True
            else:
                 logger.warning(f"No rows updated for session {session_id}.")
                 return False

        except Exception as e:
            logger.error(f"Error updating session: {e}", exc_info=True)
            return False

    def get_session_title(self, session_id: str, client=None) -> Optional[str]:
        """
        Get session title by ID.
        """
        try:
            curr_client = client if client else self._supabase.get_client()
            response = curr_client.table("chat_sessions")\
                .select("title")\
                .eq("id", session_id)\
                .execute()
            if response.data:
                return response.data[0].get("title")
            return None
        except Exception as e:
            logger.error(f"Error fetching session title: {e}")
            return None

chat_repo = ChatRepository()
