from app.ai.classification.predict_classification import predict_classification
from app.ai.segmentation.transunet.predict_segmentation import predict_segmentation
import cv2

def process_exam_sync(exam):
    try:
        # Classificação
        class_id, confidence = predict_classification(exam.imagem_path)
        
        # Salvar resultado da classificação
        exam.resultado = "com endometriose" if class_id == 0 else "sem endometriose"
        exam.confianca = confidence
        
        # Se for "com endometriose", aplicar segmentação
        if class_id == 0:
            mask = predict_segmentation(exam.imagem_path)
            # Aqui você pode salvar a máscara gerada, por exemplo, em /uploads/masks/
            mask_path = f"uploads/masks/{exam.id}_mask.png"
            cv2.imwrite(mask_path, mask)
            exam.mask_path = mask_path
        
        exam.status = "Concluído"
        db.session.commit()
    
    except Exception as e:
        exam.status = "Erro"
        exam.error_message = str(e)
        db.session.commit()