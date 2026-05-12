from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "20241113_153630.h5"


segmentation_model = tf.keras.models.load_model(
    MODEL_PATH,
    compile=False
)


def preprocess_segmentation(image_path: str):
    img = image.load_img(image_path, target_size=(224, 224))
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    return img_array


def predict_segmentation(image_path: str):
    img_array = preprocess_segmentation(image_path)
    prediction = segmentation_model.predict(img_array, verbose=0)

    mask = (prediction > 0.5).astype(np.uint8)

    if mask.ndim == 4:
        mask = mask[0, :, :, 0]
    elif mask.ndim == 3:
        mask = mask[0]

    mask = remove_small_regions(mask)

    return mask


def remove_small_regions(mask, min_area=20):
    mask = mask.astype(np.uint8)

    contours, _ = cv2.findContours(
        mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    clean_mask = np.zeros_like(mask)

    for cnt in contours:
        if cv2.contourArea(cnt) > min_area:
            cv2.drawContours(clean_mask, [cnt], -1, 1, -1)

    return clean_mask