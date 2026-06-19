import time
from datetime import datetime

from app import db
from app.models import Exame
from app.ai.classification.predict_classification import predict_classification


def process_exam_sync(exam_id: str):
    exam = Exame.query.get(exam_id)

    if not exam:
        return

    start_time = time.time()

    try:
        exam.status = "PROCESSING"
        exam.error_message = None
        db.session.commit()

        class_id, label, confidence = predict_classification(exam.imagem_path)

        exam.resultado = label
        exam.confianca = float(confidence)
        exam.status = "COMPLETED"
        exam.model_name = "SwinTiny"
        exam.model_version = "pytorch_v1"
        exam.processed_at = datetime.utcnow()
        exam.processing_time = round(time.time() - start_time, 4)
        exam.error_message = None

        db.session.commit()

    except Exception as error:
        exam.status = "FAILED"
        exam.error_message = str(error)
        exam.processing_time = round(time.time() - start_time, 4)
        db.session.commit()