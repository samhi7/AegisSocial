import unittest
import sys
import os

# Append parent directory to sys.path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.moderation_utils import moderator

class TestAIModerationSystem(unittest.TestCase):
    def setUp(self):
        # Ensure models are loaded
        self.assertIsNotNone(moderator)

    def test_clean_text(self):
        text = "Hello! I hope you are having an amazing and beautiful day."
        results = moderator.moderate_text(text)
        
        self.assertEqual(results["text"], text)
        self.assertLess(results["distilbert_prob"], 0.40)
        self.assertEqual(results["final_decision"], "publish")
        self.assertEqual(results["distilbert_pred"], 0)

    def test_borderline_warning_text(self):
        # We use a known borderline text that triggers the warning threshold (0.40 - 0.75)
        text = "You are not very smart, please stop posting."
        results = moderator.moderate_text(text)
        
        self.assertEqual(results["text"], text)
        # Should fall in the warning range [0.40, 0.75]
        self.assertTrue(0.40 <= results["distilbert_prob"] <= 0.75, 
                        f"Expected prob between 0.40 and 0.75, got {results['distilbert_prob']}")
        self.assertEqual(results["final_decision"], "warning")

    def test_severely_toxic_blocked_text(self):
        # We use a severe curse word/phrase which triggers keyword calibration block (> 0.75)
        text = "Shut up you fucking idiot, kill yourself already."
        results = moderator.moderate_text(text)
        
        self.assertEqual(results["text"], text)
        self.assertGreater(results["distilbert_prob"], 0.75)
        self.assertEqual(results["final_decision"], "block")
        self.assertEqual(results["distilbert_pred"], 1)

    def test_model_agreement(self):
        # Test a case where models agree
        clean_text = "I love programming and building web apps!"
        results = moderator.moderate_text(clean_text)
        self.assertEqual(results["baseline_pred"], results["distilbert_pred"])
        
        # Test a borderline case where they might disagree (TF-IDF vs DistilBERT context)
        disagree_text = "This garbage trash thing is somewhat bad."
        results = moderator.moderate_text(disagree_text)
        # Agreement or disagreement is possible, verify structure of scores is float and predictions are binary
        self.assertIsInstance(results["baseline_prob"], float)
        self.assertIsInstance(results["distilbert_prob"], float)
        self.assertIn(results["baseline_pred"], [0, 1])
        self.assertIn(results["distilbert_pred"], [0, 1])

if __name__ == "__main__":
    unittest.main()
