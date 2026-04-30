import structlog
import re
from typing import List, Dict, Any
from app.models import SourceDocument

logger = structlog.get_logger(__name__)

class MockLLMService:
    """Enhanced Mock LLM service with intelligent response generation"""
    
    def __init__(self):
        self.model_name = "enhanced-mock-llm-service"
    
    def get_model_info(self) -> dict:
        """Get mock model information"""
        return {
            "model": self.model_name,
            "type": "enhanced-mock"
        }
    
    def _analyze_query_type(self, query: str) -> str:
        """Analyze the type of query to provide better responses"""
        query_lower = query.lower()
        
        # Question patterns
        if any(word in query_lower for word in ['what', 'define', 'explain', 'describe']):
            return 'definition'
        elif any(word in query_lower for word in ['how', 'process', 'steps', 'procedure']):
            return 'process'
        elif any(word in query_lower for word in ['why', 'reason', 'cause', 'because']):
            return 'explanation'
        elif any(word in query_lower for word in ['when', 'time', 'date', 'period']):
            return 'temporal'
        elif any(word in query_lower for word in ['where', 'location', 'place', 'position']):
            return 'spatial'
        elif any(word in query_lower for word in ['who', 'person', 'people', 'author']):
            return 'person'
        elif any(word in query_lower for word in ['list', 'show', 'enumerate', 'mention']):
            return 'listing'
        elif any(word in query_lower for word in ['compare', 'difference', 'versus', 'vs']):
            return 'comparison'
        elif any(word in query_lower for word in ['calculate', 'compute', 'formula', 'equation']):
            return 'calculation'
        else:
            return 'general'
    
    def _extract_key_concepts(self, query: str, context_chunks: List[str]) -> List[str]:
        """Extract key concepts from query and context"""
        # Simple keyword extraction
        words = re.findall(r'\b\w+\b', query.lower())
        # Filter out common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'what', 'when', 'where', 'who', 'why', 'how'}
        key_words = [word for word in words if word not in stop_words and len(word) > 2]
        
        # Also extract from context
        context_words = []
        for chunk in context_chunks:
            chunk_words = re.findall(r'\b\w+\b', chunk.lower())
            context_words.extend([word for word in chunk_words if word in key_words])
        
        # Return most common concepts
        from collections import Counter
        all_words = key_words + context_words
        word_counts = Counter(all_words)
        return [word for word, count in word_counts.most_common(5)]
    
    def _generate_contextual_response(self, query: str, query_type: str, key_concepts: List[str], context_chunks: List[str]) -> str:
        """Generate a more contextual response based on query analysis"""
        
        if not context_chunks:
            return f"I don't have any documents to answer your question about: '{query}'. Please upload some relevant documents first."
        
        # Response templates based on query type
        templates = {
            'definition': f"Based on the documents, here's a clear definition related to your question about '{query}':",
            'process': f"According to the uploaded materials, here's the process or procedure for '{query}':",
            'explanation': f"The documents provide the following explanation regarding '{query}':",
            'temporal': f"From the information available in your documents, here's what I can tell you about the timing of '{query}':",
            'spatial': f"Based on the uploaded content, here's the location or spatial information about '{query}':",
            'person': f"According to your documents, here's the information about the person/people involved in '{query}':",
            'listing': f"Here's a comprehensive list from your documents related to '{query}':",
            'comparison': f"Based on the uploaded materials, here's the comparison analysis for '{query}':",
            'calculation': f"According to the documents, here's the calculation or formula related to '{query}':",
            'general': f"Based on the uploaded documents, here's the relevant information about '{query}':"
        }
        
        response = templates.get(query_type, templates['general']) + "\n\n"
        
        # Extract and synthesize relevant content
        relevant_content = []
        for chunk in context_chunks:
            # Find sentences containing key concepts
            sentences = re.split(r'[.!?]+', chunk)
            for sentence in sentences:
                sentence = sentence.strip()
                if any(concept.lower() in sentence.lower() for concept in key_concepts) and len(sentence) > 20:
                    relevant_content.append(sentence)
        
        if relevant_content:
            # Add the most relevant content
            response += "**Key Points:**\n\n"
            for i, content in enumerate(relevant_content[:3], 1):
                response += f"{i}. {content}.\n"
        else:
            # Fallback to showing context summary
            response += "**Relevant Information:**\n\n"
            response += f"I found {len(context_chunks)} sections that relate to your query. "
            response += f"The main concepts discussed include: {', '.join(key_concepts[:3])}.\n\n"
            
            # Show a more meaningful excerpt
            best_chunk = max(context_chunks, key=len) if context_chunks else ""
            if best_chunk:
                # Extract a meaningful sentence or two
                sentences = re.split(r'[.!?]+', best_chunk)
                meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 30]
                if meaningful_sentences:
                    response += f"**Key Excerpt:** {meaningful_sentences[0]}."
                    if len(meaningful_sentences) > 1:
                        response += f" {meaningful_sentences[1]}."
                    response += "\n"
        
        return response
    
    async def generate_response(self, query: str, context_chunks: List[str], sources: List[Dict[str, Any]]) -> str:
        """Generate an enhanced mock response based on the query and context"""
        logger.info("Generating enhanced mock response", query_length=len(query), context_count=len(context_chunks))
        
        # Analyze the query
        query_type = self._analyze_query_type(query)
        key_concepts = self._extract_key_concepts(query, context_chunks)
        
        # Generate contextual response
        response = self._generate_contextual_response(query, query_type, key_concepts, context_chunks)
        
        # Add sources section
        if sources:
            response += f"\n\n**Sources:**\n"
            for i, source in enumerate(sources[:3], 1):
                if isinstance(source, dict):
                    similarity = source.get('similarity_score', 0.0)
                    filename = source.get('filename', 'Unknown')
                    response += f"{i}. {filename} (relevance: {similarity:.1%})\n"
                else:
                    response += f"{i}. {source.filename} (relevance: {source.similarity_score:.1%})\n"
        
        # Add helpful context
        response += f"\n**Answer Type:** {query_type.title()}\n"
        response += f"**Key Concepts:** {', '.join(key_concepts[:3])}\n"
        response += f"\n*This is an enhanced mock response. For more sophisticated AI-powered answers with deeper analysis, add a valid OpenAI API key.*"
        
        return response

# Create global instance
mock_llm_service = MockLLMService()
