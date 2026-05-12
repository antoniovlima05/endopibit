import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "modelo_endometriose_convnext.keras"
CLASS_NAMES_PATH = BASE_DIR / "class_names.json"

classification_model = None


def load_classification_model():
    global classification_model

    if classification_model is None:
        classification_model = tf.keras.models.load_model(
            MODEL_PATH,
            compile=False
        )

    return classification_model


def load_class_names():
    if CLASS_NAMES_PATH.exists():
        with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    return ["sem endometriose", "com endometriose"]


def predict_classification(image_path: str):
    model = load_classification_model()
    class_names = load_class_names()

    img = image.load_img(image_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)

    probability = float(model.predict(img_array, verbose=0)[0][0])

    class_id = 1 if probability >= 0.5 else 0
    confidence = probability if class_id == 1 else 1 - probability

    label = class_names[class_id]

    return class_id, label, confidence