from dataclasses import dataclass

@dataclass
class ClassificationResult:
    label: str
    confidence: float
    model_name: str = "classifier_v1"
    model_version: str = "dev"

def predict(image_path: str) -> ClassificationResult:
    """
    TODO: Substitua o corpo pelo seu modelo real.
    Por enquanto retorna um resultado fixo só para validar a integração.
    """
    return ClassificationResult(label="NEGATIVO", confidence=0.50)