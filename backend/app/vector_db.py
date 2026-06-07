import os
import json
import re
import numpy as np
from typing import List, Dict, Any, Tuple
import google.generativeai as genai
from app.config import settings

class VectorStore:
    def __init__(self, storage_path: str = "./veyanix_vector_store.json"):
        self.storage_path = storage_path
        self.documents: Dict[str, Dict[str, Any]] = {} # id -> doc data
        self.vectors: Dict[str, List[float]] = {} # chunk_id -> dense vector / sparse dict
        self.chunks: List[Dict[str, Any]] = [] # list of {"id": str, "doc_id": str, "text": str, "metadata": dict}
        
        # TF-IDF state for fallback mode
        self.vocab: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.tfidf_matrix: np.ndarray = np.array([])
        
        self.load()
        
    def save(self):
        """Serializes current index state to disk."""
        data = {
            "documents": self.documents,
            "chunks": self.chunks,
            "vectors": self.vectors,
            "vocab": self.vocab,
            "idf": self.idf
        }
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            
    def load(self):
        """Loads index state if exists."""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.documents = data.get("documents", {})
                    self.chunks = data.get("chunks", [])
                    self.vectors = data.get("vectors", {})
                    self.vocab = data.get("vocab", {})
                    self.idf = data.get("idf", {})
                self._rebuild_tfidf_matrix()
            except Exception:
                # Reset if corrupted
                self.documents = {}
                self.chunks = []
                self.vectors = {}
                self.vocab = {}
                self.idf = {}
                
    def _rebuild_tfidf_matrix(self):
        """Re-computes TF-IDF matrices over chunks for the fallback similarity scanner."""
        if not self.chunks or not self.vocab:
            self.tfidf_matrix = np.array([])
            return
            
        num_chunks = len(self.chunks)
        vocab_size = len(self.vocab)
        matrix = np.zeros((num_chunks, vocab_size))
        
        for idx, chunk in enumerate(self.chunks):
            tokens = self._tokenize(chunk["text"])
            for t in tokens:
                if t in self.vocab:
                    t_idx = self.vocab[t]
                    # TF component (raw frequency)
                    matrix[idx, t_idx] += 1
            
            # Multiply by IDF
            for t, t_idx in self.vocab.items():
                matrix[idx, t_idx] *= self.idf.get(t, 0.0)
                
        # Normalize vectors for cosine similarity calculation
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        # Avoid divide-by-zero
        norms[norms == 0] = 1.0
        self.tfidf_matrix = matrix / norms

    def _tokenize(self, text: str) -> List[str]:
        """Cleans and tokenizes raw strings into lowercase word tokens."""
        text = text.lower()
        text = re.sub(r"[^\w\s]", " ", text)
        return [w for w in text.split() if len(w) > 2]

    def _compute_idf(self, all_documents_tokens: List[List[str]]):
        """Calculates Inverse Document Frequency for vocabulary items."""
        N = len(all_documents_tokens)
        if N == 0:
            return
            
        doc_counts: Dict[str, int] = {}
        for doc_tokens in all_documents_tokens:
            unique_tokens = set(doc_tokens)
            for t in unique_tokens:
                doc_counts[t] = doc_counts.get(t, 0) + 1
                
        self.idf = {}
        for t, count in doc_counts.items():
            # Standard IDF formula: log(1 + N / document_frequency)
            self.idf[t] = float(np.log(1.0 + N / count))

    def add_document(self, doc_id: str, title: str, content: str, metadata: Dict[str, Any] = None):
        """
        Splits a text document into chunks, calculates dense/sparse vectors, 
        and updates the search indexes.
        """
        metadata = metadata or {}
        self.documents[doc_id] = {
            "title": title,
            "metadata": metadata
        }
        
        # Remove old chunks of this document to support overwrites
        self.chunks = [c for c in self.chunks if c["doc_id"] != doc_id]
        
        # Basic chunking by paragraph / character length bounds
        paragraphs = content.split("\n\n")
        chunks_to_add = []
        
        for idx, para in enumerate(paragraphs):
            para = para.strip()
            if len(para) < 20: # skip trivial chunks
                continue
                
            chunk_id = f"{doc_id}_chunk_{idx}"
            chunks_to_add.append({
                "id": chunk_id,
                "doc_id": doc_id,
                "text": para,
                "metadata": metadata
            })
            
        self.chunks.extend(chunks_to_add)
        
        # Check API key configuration for Dense Embedding vectors
        if not settings.USE_MOCK_AI:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                for chunk in chunks_to_add:
                    # Request embedding using Gemini API
                    response = genai.embed_content(
                        model="models/text-embedding-004",
                        content=chunk["text"],
                        task_type="retrieval_document"
                    )
                    self.vectors[chunk["id"]] = response["embedding"]
                self.save()
                return
            except Exception as e:
                # Fallback to TF-IDF if API fails
                pass
                
        # --- Fallback Mode: TF-IDF Sparse Vector indexing ---
        # 1. Build Vocabulary
        all_tokens = []
        chunk_tokens_list = []
        for chunk in self.chunks:
            tokens = self._tokenize(chunk["text"])
            chunk_tokens_list.append(tokens)
            all_tokens.extend(tokens)
            
        unique_vocab = sorted(list(set(all_tokens)))
        self.vocab = {t: idx for idx, t in enumerate(unique_vocab)}
        
        # 2. Compute IDFs
        self._compute_idf(chunk_tokens_list)
        
        # 3. Build Matrices
        self._rebuild_tfidf_matrix()
        self.save()

    def search(self, query: str, doc_ids: List[str] = None, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Performs a cosine similarity vector search over the index, filtering by 
        document scope, and returns relevant matches with similarity scores.
        """
        if not self.chunks:
            return []
            
        # Filter chunks by doc scope if specified
        filtered_indices = []
        filtered_chunks = []
        
        for idx, chunk in enumerate(self.chunks):
            if doc_ids is None or chunk["doc_id"] in doc_ids:
                filtered_indices.append(idx)
                filtered_chunks.append(chunk)
                
        if not filtered_chunks:
            return []
            
        # Dense Cosine Similarity Search using Gemini Embeddings
        if not settings.USE_MOCK_AI and all(c["id"] in self.vectors for c in filtered_chunks):
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                response = genai.embed_content(
                    model="models/text-embedding-004",
                    content=query,
                    task_type="retrieval_query"
                )
                query_vector = np.array(response["embedding"])
                
                results = []
                for chunk in filtered_chunks:
                    doc_vector = np.array(self.vectors[chunk["id"]])
                    
                    # Cosine Similarity: dot(A, B) / (norm(A) * norm(B))
                    dot_prod = np.dot(query_vector, doc_vector)
                    norm_q = np.linalg.norm(query_vector)
                    norm_d = np.linalg.norm(doc_vector)
                    score = dot_prod / (norm_q * norm_d) if (norm_q * norm_d) != 0 else 0.0
                    
                    results.append((chunk, float(score)))
                    
                # Sort by score descending
                results.sort(key=lambda x: x[1], reverse=True)
                return [{"chunk": r[0], "score": r[1]} for r in results[:limit]]
            except Exception:
                # If dense embedding fails, fallback
                pass
                
        # --- Fallback Mode: TF-IDF Cosine Similarity Search ---
        query_tokens = self._tokenize(query)
        query_vector = np.zeros(len(self.vocab))
        
        for t in query_tokens:
            if t in self.vocab:
                t_idx = self.vocab[t]
                query_vector[t_idx] += 1
                
        for t, t_idx in self.vocab.items():
            query_vector[t_idx] *= self.idf.get(t, 0.0)
            
        norm_q = np.linalg.norm(query_vector)
        if norm_q == 0:
            norm_q = 1.0
        query_vector = query_vector / norm_q
        
        results = []
        for idx, f_idx in enumerate(filtered_indices):
            # Read pre-normalized vector
            doc_vector = self.tfidf_matrix[f_idx]
            # Since both vectors are pre-normalized, cosine similarity is just the dot product
            score = float(np.dot(query_vector, doc_vector))
            results.append((filtered_chunks[idx], score))
            
        results.sort(key=lambda x: x[1], reverse=True)
        return [{"chunk": r[0], "score": r[1]} for r in results[:limit]]

vector_store = VectorStore()
