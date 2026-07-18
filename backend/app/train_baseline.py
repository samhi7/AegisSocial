import os
import pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Create a rich synthetic training dataset
data = [
    # Clean / Positive (Label: 0)
    ("Hello everyone! Have a wonderful day.", 0),
    ("This is a beautiful photograph. Thanks for sharing!", 0),
    ("I absolutely love this. You did a great job!", 0),
    ("Could you help me understand how this works?", 0),
    ("Just finished a great run! Feeling healthy.", 0),
    ("Congratulations on your graduation! So proud of you.", 0),
    ("That project looks amazing. Good luck with the release!", 0),
    ("Happy birthday to my best friend!", 0),
    ("Wow, this is spectacular. The colors are amazing.", 0),
    ("I agree with your point. Let's discuss it further.", 0),
    ("Thank you so much for the kind words.", 0),
    ("This recipe looks delicious. I'll try it tonight.", 0),
    ("I love walking in the park in the morning.", 0),
    ("Awesome work! Keep it up.", 0),
    ("Looking forward to our meeting tomorrow.", 0),
    ("Hope you recover soon! Sending positive vibes.", 0),
    ("What a peaceful place. Where was this taken?", 0),
    ("This article is very well written. Very informative.", 0),
    ("Nice to meet you all here.", 0),
    ("Let's collaborate on this new project.", 0),
    ("The weather today is perfect.", 0),
    ("This coffee is exactly what I needed.", 0),
    ("You are an amazing writer, love your posts.", 0),
    ("Such an inspiring story, thank you.", 0),
    ("We should organize a meetup soon.", 0),
    ("Indeed, that's a very logical explanation.", 0),
    ("Let's keep coding and building cool things.", 0),
    ("The design is clean and user-friendly.", 0),
    ("Great photo! What camera did you use?", 0),
    ("Welcome to our platform!", 0),

    # Toxic / Offensive (Label: 1)
    ("You are an absolute idiot and a total failure.", 1),
    ("Shut up, nobody cares about your stupid opinion.", 1),
    ("I hate you, you are the worst person on this planet.", 1),
    ("This post is completely stupid and trash. Delete it.", 1),
    ("Go away, you loser. Nobody wants you here.", 1),
    ("You are so ugly and pathetic.", 1),
    ("Stop posting this garbage. You are waste of space.", 1),
    ("I hope you fail miserably. You deserve it.", 1),
    ("Get lost, you moron.", 1),
    ("This is a piece of crap, you have no talent.", 1),
    ("You're a disgusting scumbag.", 1),
    ("Kill yourself, the world would be better off.", 1),
    ("You talk so much nonsense, just shut your mouth.", 1),
    ("Stupid bastard, go to hell.", 1),
    ("This website is garbage and so are you.", 1),
    ("You're a brainless fool, stop talking.", 1),
    ("Retard, what is wrong with you?", 1),
    ("I hate everything you do, you make me sick.", 1),
    ("You are a pathetic excuse for a human being.", 1),
    ("Shut your fat mouth, no one is listening.", 1),
    ("You are incredibly dumb, it hurts.", 1),
    ("Die already, you worthless piece of trash.", 1),
    ("You are a clown. A absolute joke.", 1),
    ("Such a terrible post, you are incompetent.", 1),
    ("Fucking idiot, get out of here.", 1),
    ("This is crap. Total bullshit.", 1),
    ("You are a liar and a cheat.", 1),
    ("Screw you and your stupid friends.", 1),
    ("No one cares about your miserable life.", 1),
    ("You are toxic and obnoxious.", 1)
]

def train_model():
    # Expand dataset with variations to improve robustness
    texts, labels = zip(*data)
    texts = list(texts)
    labels = list(labels)

    # Let's add some more toxic keywords/phrases to beef up the TF-IDF vocabulary
    extra_toxic_words = [
        "hate", "stupid", "idiot", "loser", "moron", "crap", "garbage", "trash",
        "ugly", "pathetic", "disgusting", "scumbag", "bastard", "brainless", 
        "retard", "worthless", "fuck", "bullshit", "shit", "screw", "obnoxious"
    ]
    for word in extra_toxic_words:
        texts.append(f"You are a {word}.")
        labels.append(1)
        texts.append(f"This is {word}.")
        labels.append(1)

    # Train TF-IDF vectorizer
    vectorizer = TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        sublinear_tf=True
    )
    X = vectorizer.fit_transform(texts)
    y = np.array(labels)

    # Train Logistic Regression with class balancing and strong regularization
    model = LogisticRegression(C=1.0, max_iter=200, class_weight='balanced')
    model.fit(X, y)

    # Create models directory
    os.makedirs("c:/Users/ADMIN/Desktop/Mini_project_AI/backend/app/models", exist_ok=True)

    # Save vectorizer and model
    with open("c:/Users/ADMIN/Desktop/Mini_project_AI/backend/app/models/tfidf_vectorizer.pkl", "wb") as f:
        pickle.dump(vectorizer, f)
    with open("c:/Users/ADMIN/Desktop/Mini_project_AI/backend/app/models/logistic_regression.pkl", "wb") as f:
        pickle.dump(model, f)

    print("Baseline model trained and saved successfully.")

if __name__ == "__main__":
    train_model()
