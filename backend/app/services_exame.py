from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError

from . import db
from .models import Exame
from .ai_classifier import predict

def process_exam_sync(exam_id: str) -> None:
    e = Exame.query.get(exam_id)
    if not e:
        return

    try:
        e.status = "PROCESSING"
        db.session.commit()

        result = predict(e.imagem_path)

        e.resultado = result.label
        e.confianca = float(result.confidence)
        e.model_name = result.model_name
        e.model_version = result.model_version
        e.processed_at = datetime.utcnow()
        e.status = "COMPLETED"
        e.error_message = None

        db.session.commit()

    except Exception as ex:
        try:
            e.status = "FAILED"
            e.error_message = str(ex)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
        raise