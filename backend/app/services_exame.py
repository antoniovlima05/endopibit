from datetime import datetime
import time
from sqlalchemy.exc import SQLAlchemyError

from . import db
from .models import Exame
from .ai_classifier import predict

def process_exam_sync(exam_id: str) -> None:
    e = Exame.query.get(exam_id)
    if not e:
        return

    start_time = time.perf_counter()

    try:
        e.status = "PROCESSING"
        db.session.commit()

        result = predict(e.imagem_path)

        elapsed = time.perf_counter() - start_time

        e.resultado = result.label
        e.confianca = float(result.confidence)
        e.model_name = result.model_name
        e.model_version = result.model_version
        e.processed_at = datetime.utcnow()
        e.processing_time = elapsed
        e.status = "COMPLETED"
        e.error_message = None

        db.session.commit()

    except Exception as ex:
        elapsed = time.perf_counter() - start_time
        try:
            e.status = "FAILED"
            e.error_message = str(ex)
            e.processing_time = elapsed
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
        raise