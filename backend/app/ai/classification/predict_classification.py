from pathlib import Path

import torch
import timm
from PIL import Image
from torchvision import transforms


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "best_swin_endo.pth"

MODEL_NAME = "swin_tiny_patch4_window7_224.ms_in1k"
IMAGE_SIZE = 224
NUM_CLASSES = 2

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

classification_model = None

transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize(256),
    transforms.CenterCrop(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


def load_classification_model():
    global classification_model

    if classification_model is None:
        model = timm.create_model(
            MODEL_NAME,
            pretrained=False,
            num_classes=NUM_CLASSES,
        )

        state_dict = torch.load(MODEL_PATH, map_location=DEVICE)
        model.load_state_dict(state_dict)

        model.to(DEVICE)
        model.eval()

        classification_model = model

    return classification_model


def predict_classification(image_path: str):
    model = load_classification_model()

    img = Image.open(image_path).convert("RGB")
    tensor = transform(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.softmax(outputs, dim=1)[0]

    pred_idx = int(torch.argmax(probs).item())
    confidence = float(probs[pred_idx].item())

    # Modelo novo:
    # 0 = endometriose
    # 1 = saudavel
    #
    # Backend antigo:
    # 0 = sem endometriose
    # 1 = com endometriose

    if pred_idx == 0:
        class_id = 1
        label = "com endometriose"
    else:
        class_id = 0
        label = "sem endometriose"

    return class_id, label, confidence