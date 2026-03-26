"""
Векторизация текста для ML алгоритмов
"""
import numpy as np
import requests
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import config


class Vectorizer:
    """Сервис для векторизации текста"""
    
    def __init__(self):
        """Инициализация векторайзера"""
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 2),  # Униграммы и биграммы
            min_df=1,
            lowercase=True,
            stop_words=None  # Можно добавить русские стоп-слова
        )
        
        # Sentence Transformer для семантических эмбеддингов
        self.sentence_model = None
        self._load_sentence_transformer()
    
    def _has_ollama_config(self) -> bool:
        return bool(config.OLLAMA_BASE_URL and config.OLLAMA_MODEL)
    
    def _get_ollama_headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        if config.OLLAMA_API_KEY:
            headers["Authorization"] = f"Bearer {config.OLLAMA_API_KEY}"
        return headers
    
    def _vectorize_ollama(self, texts: list[str]) -> np.ndarray | None:
        """
        Векторизация через Ollama API.
        Поддерживает /api/embed (новый) и /api/embeddings (совместимость).
        """
        if not texts or not self._has_ollama_config():
            return None
        
        base = config.OLLAMA_BASE_URL.rstrip("/")
        headers = self._get_ollama_headers()
        
        # 1) Новый endpoint: /api/embed
        try:
            response = requests.post(
                f"{base}/api/embed",
                json={"model": config.OLLAMA_MODEL, "input": texts},
                headers=headers,
                timeout=config.OLLAMA_TIMEOUT_SEC
            )
            if response.ok:
                payload = response.json()
                embeddings = payload.get("embeddings")
                if isinstance(embeddings, list) and embeddings:
                    return np.array(embeddings, dtype=float)
        except Exception:
            pass
        
        # 2) Старый endpoint: /api/embeddings (по одному тексту)
        vectors = []
        try:
            for text in texts:
                response = requests.post(
                    f"{base}/api/embeddings",
                    json={"model": config.OLLAMA_MODEL, "prompt": text},
                    headers=headers,
                    timeout=config.OLLAMA_TIMEOUT_SEC
                )
                if not response.ok:
                    return None
                payload = response.json()
                embedding = payload.get("embedding")
                if not isinstance(embedding, list) or not embedding:
                    return None
                vectors.append(embedding)
            return np.array(vectors, dtype=float) if vectors else None
        except Exception:
            return None
    
    def _load_sentence_transformer(self):
        """Загрузка Sentence Transformer модели"""
        try:
            from sentence_transformers import SentenceTransformer
            self.sentence_model = SentenceTransformer(
                config.SENTENCE_TRANSFORMER_MODEL
            )
            print(f"[OK] Loaded model: {config.SENTENCE_TRANSFORMER_MODEL}")
        except Exception as e:
            print(f"[WARN] Sentence Transformer load failed: {e}")
            if self._has_ollama_config():
                print("[WARN] Falling back to Ollama embeddings")
            else:
                print("[WARN] Falling back to TF-IDF only")
            self.sentence_model = None
    
    def vectorize_tfidf(self, texts: list[str]) -> np.ndarray:
        """
        Векторизация текстов с помощью TF-IDF
        
        Args:
            texts: Список текстов
        
        Returns:
            Матрица векторов
        """
        if not texts:
            return np.array([])
        
        try:
            vectors = self.tfidf_vectorizer.fit_transform(texts)
            return vectors.toarray()
        except Exception as e:
            print(f"Ошибка TF-IDF векторизации: {e}")
            return np.zeros((len(texts), 100))
    
    def transform_tfidf(self, text: str) -> np.ndarray:
        """
        Преобразование одного текста с помощью обученного TF-IDF
        
        Args:
            text: Текст для преобразования
        
        Returns:
            Вектор
        """
        try:
            vector = self.tfidf_vectorizer.transform([text])
            return vector.toarray()[0]
        except Exception as e:
            print(f"Ошибка TF-IDF трансформации: {e}")
            return np.zeros(100)
    
    def vectorize_semantic(self, texts: list[str]) -> np.ndarray:
        """
        Семантическая векторизация с помощью Sentence Transformers
        
        Args:
            texts: Список текстов
        
        Returns:
            Матрица эмбеддингов
        """
        if not self.sentence_model:
            ollama_vectors = self._vectorize_ollama(texts)
            if ollama_vectors is not None:
                return ollama_vectors
            print("[WARN] Semantic backend unavailable, using TF-IDF")
            return self.vectorize_tfidf(texts)
        
        try:
            embeddings = self.sentence_model.encode(
                texts,
                show_progress_bar=False,
                convert_to_numpy=True
            )
            return embeddings
        except Exception as e:
            print(f"Ошибка семантической векторизации: {e}")
            ollama_vectors = self._vectorize_ollama(texts)
            if ollama_vectors is not None:
                return ollama_vectors
            return self.vectorize_tfidf(texts)
    
    def get_semantic_backend(self) -> str:
        """Текущий backend для semantic-векторизации."""
        if self.sentence_model is not None:
            return "sentence-transformer"
        if self._has_ollama_config():
            return "ollama"
        return "tfidf"
    
    def calculate_similarity(
        self,
        text1: str,
        text2: str,
        method: str = "semantic"
    ) -> float:
        """
        Рассчитывает косинусное сходство между двумя текстами
        
        Args:
            text1: Первый текст
            text2: Второй текст
            method: "semantic" или "tfidf"
        
        Returns:
            Сходство (0.0-1.0)
        """
        if method == "semantic" and (self.sentence_model or self._has_ollama_config()):
            # Семантическое сходство
            embeddings = self.vectorize_semantic([text1, text2])
            similarity = cosine_similarity(
                embeddings[0].reshape(1, -1),
                embeddings[1].reshape(1, -1)
            )[0][0]
        else:
            # TF-IDF сходство
            vectors = self.vectorize_tfidf([text1, text2])
            if vectors.shape[0] < 2:
                return 0.0
            similarity = cosine_similarity(
                vectors[0].reshape(1, -1),
                vectors[1].reshape(1, -1)
            )[0][0]
        
        # Нормализация: cosine_similarity возвращает от -1 до 1,
        # но обычно в диапазоне 0-1 для текстов
        return float(max(0.0, min(1.0, similarity)))
    
    def calculate_batch_similarity(
        self,
        query_text: str,
        corpus_texts: list[str],
        method: str = "semantic"
    ) -> list[float]:
        """
        Рассчитывает сходство одного текста со списком текстов
        
        Args:
            query_text: Запрос
            corpus_texts: Список текстов для сравнения
            method: "semantic" или "tfidf"
        
        Returns:
            Список оценок сходства
        """
        if not corpus_texts:
            return []
        
        if method == "semantic" and (self.sentence_model or self._has_ollama_config()):
            # Семантическое сходство
            all_texts = [query_text] + corpus_texts
            embeddings = self.vectorize_semantic(all_texts)
            
            query_embedding = embeddings[0].reshape(1, -1)
            corpus_embeddings = embeddings[1:]
            
            similarities = cosine_similarity(query_embedding, corpus_embeddings)[0]
        else:
            # TF-IDF сходство
            all_texts = [query_text] + corpus_texts
            vectors = self.vectorize_tfidf(all_texts)
            
            if vectors.shape[0] < 2:
                return [0.0] * len(corpus_texts)
            
            query_vector = vectors[0].reshape(1, -1)
            corpus_vectors = vectors[1:]
            
            similarities = cosine_similarity(query_vector, corpus_vectors)[0]
        
        # Нормализация
        return [float(max(0.0, min(1.0, sim))) for sim in similarities]
