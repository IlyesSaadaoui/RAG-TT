from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ChatMessageCreate(BaseModel):
    sender: str
    text: str
    rag_type: Optional[str] = "naive"


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    sender: str
    text: str
    rag_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    user_email: str
    title: Optional[str] = "Nouvelle discussion"


class ChatSessionResponse(BaseModel):
    id: str
    user_email: str
    title: str
    created_at: datetime
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True
