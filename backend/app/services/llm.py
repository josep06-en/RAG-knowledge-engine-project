import asyncio
from typing import List, Dict, Any, Optional
import openai
import tiktoken
import structlog
import time
from app.models import SourceDocument, QueryRequest, QueryResponse
from app.config import settings

logger = structlog.get_logger(__name__)


class OpenAILLMService:
    """
    Production-ready OpenAI LLM service for generating responses using GPT-4o-mini.
    Supports RAG (Retrieval-Augmented Generation) with context from retrieved documents.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        # Use provided API key or fall back to settings
        effective_api_key = api_key or settings.openai_api_key
        self.client = openai.OpenAI(api_key=effective_api_key)
        self.model = settings.openai_chat_model
        self.temperature = settings.openai_temperature
        self.max_tokens = settings.openai_max_tokens
        self.encoding = tiktoken.get_encoding("cl100k_base")
        
        logger.info("Initialized OpenAI LLM service", 
                   model=self.model, 
                   has_user_key=bool(api_key))
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens in text using OpenAI's encoding."""
        return len(self.encoding.encode(text))
    
    def _format_context(self, sources: List[SourceDocument]) -> str:
        """
        Format retrieved documents into a context string for the LLM.
        
        Args:
            sources: List of retrieved source documents
            
        Returns:
            Formatted context string
        """
        if not sources:
            return "No relevant documents were found to answer your question."
        
        context_parts = []
        for i, source in enumerate(sources, 1):
            context_parts.append(
                f"[Document {i}] (Source: {source.filename}, Similarity: {source.similarity_score:.2f}):\n"
                f"{source.content}"
            )
        
        return "\n\n".join(context_parts)
    
    def _create_rag_prompt(self, query: str, context: str) -> str:
        """
        Create a RAG prompt with context and user query.
        
        Args:
            query: User's question
            context: Retrieved document context
            
        Returns:
            Formatted prompt string
        """
        prompt = f"""You are a helpful AI assistant that answers questions based on the provided context.

CONTEXT:
{context}

USER QUESTION:
{query}

INSTRUCTIONS:
1. Answer the user's question based ONLY on the provided context
2. If the context doesn't contain enough information to answer the question, say so clearly
3. Be concise but thorough in your response
4. If you use information from the context, cite the source document numbers
5. Do not make up information that isn't in the context

ANSWER:"""
        
        return prompt
    
    async def generate_rag_response(
        self,
        query: str,
        sources: List[SourceDocument],
        top_k: int = 5,
        similarity_threshold: float = 0.7
    ) -> str:
        """
        Generate a response using RAG (Retrieval-Augmented Generation).
        
        Args:
            query: User's question
            sources: Retrieved source documents
            top_k: Number of sources used (for logging)
            similarity_threshold: Minimum similarity threshold (for logging)
            
        Returns:
            Generated response text
        """
        start_time = time.time()
        
        try:
            # Format context from retrieved documents
            context = self._format_context(sources)
            
            # Create RAG prompt
            prompt = self._create_rag_prompt(query, context)
            
            # Check token limits
            prompt_tokens = self._count_tokens(prompt)
            if prompt_tokens > self.max_tokens * 0.8:  # Leave room for response
                logger.warning("Prompt exceeds recommended token limit",
                           prompt_tokens=prompt_tokens,
                           max_tokens=self.max_tokens)
                
                # Truncate context if needed
                context = self._truncate_context(context, self.max_tokens * 0.6)
                prompt = self._create_rag_prompt(query, context)
                prompt_tokens = self._count_tokens(prompt)
            
            logger.info("Generating RAG response",
                       query_length=len(query),
                       sources_count=len(sources),
                       prompt_tokens=prompt_tokens)
            
            # Generate response from OpenAI
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=min(self.max_tokens - prompt_tokens, 2000)  # Reserve tokens for response
            )
            
            answer = response.choices[0].message.content.strip()
            
            response_time = (time.time() - start_time) * 1000
            
            logger.info("RAG response generated successfully",
                       response_tokens=response.usage.completion_tokens,
                       total_tokens=response.usage.total_tokens,
                       response_time_ms=response_time)
            
            return answer
            
        except openai.RateLimitError as e:
            logger.error("OpenAI rate limit exceeded", error=str(e))
            raise Exception(f"Rate limit exceeded. Please try again later: {str(e)}")
        
        except openai.APIError as e:
            logger.error("OpenAI API error", error=str(e))
            raise Exception(f"OpenAI API error: {str(e)}")
        
        except Exception as e:
            logger.error("Failed to generate RAG response", error=str(e))
            raise
    
    def _truncate_context(self, context: str, max_tokens: int) -> str:
        """
        Truncate context to fit within token limits.
        
        Args:
            context: Original context string
            max_tokens: Maximum allowed tokens
            
        Returns:
            Truncated context string
        """
        tokens = self.encoding.encode(context)
        if len(tokens) <= max_tokens:
            return context
        
        # Truncate tokens and decode back to text
        truncated_tokens = tokens[:max_tokens - 50]  # Leave some buffer
        truncated_text = self.encoding.decode(truncated_tokens)
        
        # Add truncation notice
        truncated_text += "\n\n[Note: Context was truncated due to length limits]"
        
        return truncated_text
    
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Generate a response from the LLM with given messages.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            temperature: Override default temperature
            max_tokens: Override default max tokens
            
        Returns:
            Generated response text
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature or self.temperature,
                max_tokens=max_tokens or self.max_tokens
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error("Failed to generate response", error=str(e))
            raise
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the LLM model."""
        return {
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "provider": "OpenAI",
            "encoding": "cl100k_base"
        }
    
    async def answer_question(
        self,
        request: QueryRequest,
        sources: List[SourceDocument]
    ) -> QueryResponse:
        """
        Complete RAG pipeline: generate answer with sources and timing.
        
        Args:
            request: Query request object
            sources: Retrieved source documents
            
        Returns:
            Complete query response with answer and sources
        """
        start_time = time.time()
        
        try:
            # Generate answer
            answer = await self.generate_rag_response(
                query=request.query,
                sources=sources,
                top_k=request.top_k,
                similarity_threshold=request.similarity_threshold
            )
            
            # Calculate response time
            response_time = (time.time() - start_time) * 1000
            
            # Create response
            response = QueryResponse(
                answer=answer,
                sources=sources,
                query=request.query,
                response_time_ms=response_time,
                total_chunks_retrieved=len(sources)
            )
            
            logger.info("Question answered successfully",
                       query_length=len(request.query),
                       sources_used=len(sources),
                       response_time_ms=response_time)
            
            return response
            
        except Exception as e:
            logger.error("Failed to answer question", error=str(e))
            raise


# Global instance (will be initialized with user API key)
llm_service = None


def get_llm_service(api_key: str = None) -> OpenAILLMService:
    """Get LLM service instance with user API key."""
    global llm_service
    if llm_service is None or api_key:
        llm_service = OpenAILLMService(api_key=api_key)
    return llm_service
