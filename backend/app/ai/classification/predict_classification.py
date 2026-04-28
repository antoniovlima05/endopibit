import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image

# Carregar o modelo de classificação (já contém as camadas personalizadas)
classification_model = tf.keras.models.load_model(
    "app/ai/classification/modelo_endometriose_convnext.h5", 
    custom_objects={}  # Não é mais necessário registrar camadas manualmente
)

def predict_classification(image_path):
    img = image.load_img(image_path, target_size=(224, 224))
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)  # Adiciona a dimensão do batch

    prediction = classification_model.predict(img_array)
    class_id = np.argmax(prediction, axis=-1)[0]
    confidence = np.max(prediction, axis=-1)[0]

    return class_id, confidence