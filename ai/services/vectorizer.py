"""
Векторизация текста для ML алгоритмов
"""
import numpy as np
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
    
    def _load_sentence_transformer(self):
        """Загрузка Sentence Transformer модели"""
        try:
            from sentence_transformers import SentenceTransformer
            self.sentence_model = SentenceTransformer(
                config.SENTENCE_TRANSFORMER_MODEL
            )
            print(f"✓ Загружена модель: {config.SENTENCE_TRANSFORMER_MODEL}")
        except Exception as e:
            print(f"⚠️ Не удалось загрузить Sentence Transformer: {e}")
            print("Будет использоваться только TF-IDF")
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
            print("⚠️ Sentence Transformer не доступен, используем TF-IDF")
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
            return self.vectorize_tfidf(texts)
    
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
        if method == "semantic" and self.sentence_model:
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
        
        if method == "semantic" and self.sentence_model:
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
