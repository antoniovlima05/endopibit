import tensorflow as tf
import numpy as np
import cv2
from tensorflow.keras.preprocessing import image

# Carregar modelo de segmentação
segmentation_model = tf.keras.models.load_model("app/ai/segmentation/transunet/model_endometriose_transunet.h5")

def preprocess_segmentation(image_path):
    img = image.load_img(image_path, target_size=(224, 224))
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)  # Adiciona batch dimension
    return img_array

def predict_segmentation(image_path):
    img_array = preprocess_segmentation(image_path)
    prediction = segmentation_model.predict(img_array)

    # Binarizar a máscara
    mask = (prediction > 0.5).astype(np.uint8)

    # Pós-processamento
    mask = remove_small_regions(mask)  # Aqui aplica o processo de remoção de contornos pequenos, se necessário.

    return mask

def remove_small_regions(mask, min_area=20):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    clean_mask = np.zeros_like(mask)

    for cnt in contours:
        if cv2.contourArea(cnt) > min_area:
            cv2.drawContours(clean_mask, [cnt], -1, 1, -1)

    return clean_mask