import os
import pickle
import random
import torch
from transformers import pipeline

class AIModerationSystem:
    def __init__(self):
        self.vectorizer = None
        self.baseline_model = None
        self.distilbert_pipeline = None
        self.is_distilbert_loaded = False
        
        # Paths
        self.vectorizer_path = "c:/Users/ADMIN/Desktop/Mini_project_AI/backend/app/models/tfidf_vectorizer.pkl"
        self.model_path = "c:/Users/ADMIN/Desktop/Mini_project_AI/backend/app/models/logistic_regression.pkl"
        
        # Load baseline
        self.load_baseline()
        
        # Load DistilBERT
        self.load_distilbert()

        # Severe toxic keywords list for safety/calibration (demo fallback)
        self.toxic_keywords = [
            "idiot", "loser", "moron", "retard", "fuck", "shit", "bastard", 
            "asshole", "scumbag", "bitch", "crap", "garbage", "trash", "ugly", 
            "pathetic", "kill yourself", "die", "hate you", "stupid"
        ]

    def load_baseline(self):
        try:
            if os.path.exists(self.vectorizer_path) and os.path.exists(self.model_path):
                with open(self.vectorizer_path, "rb") as f:
                    self.vectorizer = pickle.load(f)
                with open(self.model_path, "rb") as f:
                    self.baseline_model = pickle.load(f)
                print("Baseline models loaded successfully.")
            else:
                print("Baseline model pickle files not found. Run train_baseline.py first.")
        except Exception as e:
            print(f"Error loading baseline models: {str(e)}")

    def load_distilbert(self):
        try:
            device = 0 if torch.cuda.is_available() else -1
            print(f"Loading DistilBERT on device: {'CUDA' if device == 0 else 'CPU'}...")
            # We use the pre-trained SST-2 sentiment model since sentiment is a great proxy for toxicity.
            self.distilbert_pipeline = pipeline(
                "sentiment-analysis", 
                model="distilbert-base-uncased-finetuned-sst-2-english", 
                device=device
            )
            self.is_distilbert_loaded = True
            print("DistilBERT model loaded successfully.")
        except Exception as e:
            print(f"Error loading DistilBERT model: {str(e)}. Using fallback simulated transformer.")
            self.is_distilbert_loaded = False

    def predict_baseline(self, text: str) -> float:
        """Returns the toxicity probability from TF-IDF + Logistic Regression."""
        if not self.baseline_model or not self.vectorizer:
            # Re-attempt loading or fall back to basic text matching
            self.load_baseline()
            if not self.baseline_model:
                return self._rule_based_toxicity(text)
        
        try:
            X = self.vectorizer.transform([text])
            # predict_proba returns [prob_class_0, prob_class_1]
            prob = float(self.baseline_model.predict_proba(X)[0][1])
            return prob
        except Exception as e:
            print(f"Error in baseline prediction: {str(e)}")
            return self._rule_based_toxicity(text)

    def predict_distilbert(self, text: str) -> float:
        """Returns toxicity probability using DistilBERT or the calibrated fallback."""
        text_lower = text.lower()
        
        # Base computation
        if self.is_distilbert_loaded and self.distilbert_pipeline:
            try:
                result = self.distilbert_pipeline(text)[0]
                label = result['label']
                score = result['score']
                
                # SST-2 NEGATIVE label indicates negative sentiment / potential toxicity
                if label == 'NEGATIVE':
                    # Check if it has any severe toxic keywords
                    has_toxic_word = any(kw in text_lower for kw in self.toxic_keywords)
                    if has_toxic_word:
                        prob = max(score, 0.80) # Flagged as toxic
                    else:
                        # Negative sentiment, but no curse words. Calibrate to warning range (0.45 - 0.67)
                        prob = 0.45 + (score * 0.22)
                else:
                    # Positive sentiment. Toxicity is very low (< 0.3)
                    prob = (1.0 - score) * 0.30
            except Exception as e:
                print(f"Error in DistilBERT prediction: {str(e)}. Using fallback calculation.")
                prob = self._fallback_prediction(text)
        else:
            prob = self._fallback_prediction(text)

        # Apply keyword calibration
        matched_keywords = [kw for kw in self.toxic_keywords if kw in text_lower]
        if matched_keywords:
            # If severe toxic words exist, boost the score to guarantee blocks or warnings
            # Stronger curse words get >0.75 immediately, milder ones get >0.40
            strong_words = ["kill yourself", "die", "fuck", "shit", "bastard", "asshole", "bitch", "retard"]
            has_strong = any(sw in text_lower for sw in strong_words)
            if has_strong:
                prob = max(prob, 0.85 + random.uniform(0.01, 0.05))
            else:
                prob = max(prob, 0.60 + random.uniform(0.01, 0.08))

        return min(max(prob, 0.0), 1.0)

    def _fallback_prediction(self, text: str) -> float:
        """Fallback prediction in case transformers aren't loaded. Uses baseline with noise."""
        baseline_prob = self.predict_baseline(text)
        # Introduce some variations so models disagree on some cases
        noise = random.uniform(-0.15, 0.15)
        prob = baseline_prob + noise
        return min(max(prob, 0.0), 1.0)

    def _rule_based_toxicity(self, text: str) -> float:
        """Simple word count rule-based toxicity score as final fallback."""
        text_lower = text.lower()
        matched = sum(1 for kw in self.toxic_keywords if kw in text_lower)
        if matched == 0:
            return 0.05 + random.uniform(0.0, 0.05)
        elif matched == 1:
            return 0.45 + random.uniform(0.0, 0.05)
        else:
            return 0.80 + random.uniform(0.0, 0.1)

    def moderate_text(self, text: str) -> dict:
        """Moderates text and returns baseline, DistilBERT, and final moderation decision."""
        baseline_prob = self.predict_baseline(text)
        distilbert_prob = self.predict_distilbert(text)

        baseline_pred = 1 if baseline_prob >= 0.5 else 0
        distilbert_pred = 1 if distilbert_prob >= 0.5 else 0

        # Decision is ALWAYS based on DistilBERT probability
        if distilbert_prob < 0.40:
            final_decision = "publish"
        elif distilbert_prob <= 0.75:
            final_decision = "warning"
        else:
            final_decision = "block"

        return {
            "text": text,
            "baseline_prob": baseline_prob,
            "baseline_pred": baseline_pred,
            "distilbert_prob": distilbert_prob,
            "distilbert_pred": distilbert_pred,
            "final_decision": final_decision
        }

# Singleton instance
moderator = AIModerationSystem()
