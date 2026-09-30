from pydantic import BaseModel, Field
from typing import Literal, Optional

class RAGQueryRequest(BaseModel):
    question: str = Field(
        ..., 
        description="La question posée par l'utilisateur",
        example="Quels sont les tarifs du roaming en zone Europe ?"
    )
    rag_type: Literal["naive", "hybrid", "agentic"] = Field(
        default="naive",
        description="Le type de stratégie RAG sélectionné",
        example="hybrid"
    )

class RAGQueryResponse(BaseModel):
    answer: str
    rag_type_used: str
    sources: Optional[list] = []
