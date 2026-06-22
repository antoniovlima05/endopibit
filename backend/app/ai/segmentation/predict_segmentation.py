from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
from PIL import Image
from torchvision import transforms


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "best_segmentation_model.pth"

MODEL_NAME = "resnet34"
IMAGE_SIZE = 288
THRESHOLD = 0.5

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

segmentation_model = None


class ConvBlock(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()

        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),

            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.block(x)


class DecoderBlock(nn.Module):
    def __init__(self, in_channels, skip_channels, out_channels):
        super().__init__()
        self.conv = ConvBlock(in_channels + skip_channels, out_channels)

    def forward(self, x, skip):
        x = F.interpolate(
            x,
            size=skip.shape[-2:],
            mode="bilinear",
            align_corners=False,
        )
        x = torch.cat([x, skip], dim=1)
        return self.conv(x)


class TimmUNet(nn.Module):
    def __init__(self, encoder_name="resnet34", pretrained=False):
        super().__init__()

        self.encoder = timm.create_model(
            encoder_name,
            pretrained=pretrained,
            features_only=True,
            out_indices=(0, 1, 2, 3, 4),
        )

        encoder_channels = self.encoder.feature_info.channels()

        self.center = ConvBlock(encoder_channels[-1], 512)

        self.dec4 = DecoderBlock(512, encoder_channels[-2], 256)
        self.dec3 = DecoderBlock(256, encoder_channels[-3], 128)
        self.dec2 = DecoderBlock(128, encoder_channels[-4], 64)
        self.dec1 = DecoderBlock(64, encoder_channels[-5], 32)

        self.final_conv = nn.Conv2d(32, 1, kernel_size=1)

    def forward(self, x):
        input_size = x.shape[-2:]

        features = self.encoder(x)

        x = self.center(features[-1])
        x = self.dec4(x, features[-2])
        x = self.dec3(x, features[-3])
        x = self.dec2(x, features[-4])
        x = self.dec1(x, features[-5])

        x = self.final_conv(x)
        x = F.interpolate(
            x,
            size=input_size,
            mode="bilinear",
            align_corners=False,
        )

        return x


transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


def load_segmentation_model():
    global segmentation_model

    if segmentation_model is None:
        model = TimmUNet(
            encoder_name=MODEL_NAME,
            pretrained=False,
        )

        state_dict = torch.load(MODEL_PATH, map_location=DEVICE)
        model.load_state_dict(state_dict)

        model.to(DEVICE)
        model.eval()

        segmentation_model = model

    return segmentation_model


def predict_segmentation(image_path: str):
    model = load_segmentation_model()

    original = Image.open(image_path).convert("RGB")
    original_width, original_height = original.size

    tensor = transform(original).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.sigmoid(logits)[0, 0].cpu().numpy()

    mask = (probs > THRESHOLD).astype(np.uint8)

    mask = cv2.resize(
        mask,
        (original_width, original_height),
        interpolation=cv2.INTER_NEAREST,
    )

    mask = remove_small_regions(mask)

    return mask


def remove_small_regions(mask, min_area=20):
    mask = mask.astype(np.uint8)

    contours, _ = cv2.findContours(
        mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    clean_mask = np.zeros_like(mask)

    for cnt in contours:
        if cv2.contourArea(cnt) > min_area:
            cv2.drawContours(clean_mask, [cnt], -1, 1, -1)

    return clean_mask