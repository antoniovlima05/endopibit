import os
from pathlib import Path
from uuid import uuid4

import cv2
import numpy as np
from flask import request, jsonify, send_file
from werkzeug.utils import secure_filename

from . import app, db
from .models import Paciente, Exame
from .services_exame import process_exam_sync
from app.ai.segmentation.predict_segmentation import predict_segmentation


UPLOAD_DIR = Path(app.root_path).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def status_label(status: str | None) -> str:
    mapping = {
        "PENDING": "Pendente",
        "PROCESSING": "Processando",
        "COMPLETED": "Concluído",
        "FAILED": "Falhou",
    }
    return mapping.get(status or "", status or "—")


def infer_correction_type(mask: np.ndarray) -> tuple[str, dict]:
    """
    Define automaticamente o tipo de correção com base na máscara gerada pela IA.

    Regras iniciais:
    - Sem pixels segmentados ou área quase zero: no-segmentation
    - Área muito pequena, muito grande ou fragmentada: redo-segmentation
    - Área plausível: partial-adjustment
    """

    mask_bin = (mask > 0).astype(np.uint8)

    total_pixels = mask_bin.shape[0] * mask_bin.shape[1]
    area_pixels = int(mask_bin.sum())
    area_ratio = area_pixels / total_pixels if total_pixels > 0 else 0

    if area_pixels == 0 or area_ratio < 0.0001:
        return "no-segmentation", {
            "area_pixels": area_pixels,
            "area_ratio": area_ratio,
            "reason": "Máscara vazia ou praticamente inexistente.",
        }

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask_bin, 8)

    components = []
    for label_id in range(1, num_labels):
        area = int(stats[label_id, cv2.CC_STAT_AREA])
        x = int(stats[label_id, cv2.CC_STAT_LEFT])
        y = int(stats[label_id, cv2.CC_STAT_TOP])
        w = int(stats[label_id, cv2.CC_STAT_WIDTH])
        h = int(stats[label_id, cv2.CC_STAT_HEIGHT])

        components.append({
            "area": area,
            "x": x,
            "y": y,
            "width": w,
            "height": h,
        })

    if not components:
        return "no-segmentation", {
            "area_pixels": area_pixels,
            "area_ratio": area_ratio,
            "reason": "Nenhum componente conectado encontrado.",
        }

    components_sorted = sorted(components, key=lambda item: item["area"], reverse=True)
    largest_component = components_sorted[0]
    largest_area = largest_component["area"]
    largest_ratio = largest_area / area_pixels if area_pixels > 0 else 0

    metrics = {
        "area_pixels": area_pixels,
        "area_ratio": area_ratio,
        "component_count": len(components),
        "largest_component_area": largest_area,
        "largest_component_ratio": largest_ratio,
        "largest_component_bbox": {
            "x": largest_component["x"],
            "y": largest_component["y"],
            "width": largest_component["width"],
            "height": largest_component["height"],
        },
    }

    if area_ratio < 0.001:
        metrics["reason"] = "Área segmentada muito pequena."
        return "redo-segmentation", metrics

    if area_ratio > 0.20:
        metrics["reason"] = "Área segmentada muito grande para uma lesão localizada."
        return "redo-segmentation", metrics

    if len(components) > 5 and largest_ratio < 0.70:
        metrics["reason"] = "Máscara muito fragmentada."
        return "redo-segmentation", metrics

    metrics["reason"] = "Máscara plausível para ajuste parcial."
    return "partial-adjustment", metrics


# ---------------------------
# PACIENTES
# ---------------------------

@app.route("/api/pacientes", methods=["GET"])
def listar_pacientes():
    pacientes = Paciente.query.all()

    return jsonify([
        {
            "id": p.id,
            "nome": p.nome,
            "exams": [
                {
                    "examId": e.id,
                    "data": e.created_at.strftime("%d/%m/%Y") if e.created_at else "—",
                    "status": getattr(e, "status", None),
                    "statusLabel": status_label(getattr(e, "status", None)),
                }
                for e in p.exames
            ],
        }
        for p in pacientes
    ])


@app.route("/api/pacientes", methods=["POST"])
def criar_paciente():
    data = request.json or {}

    pid = str(data.get("id") or "").strip()
    nome = str(data.get("nome") or "Paciente").strip()
    idade = data.get("idade")
    sexo_id = data.get("sexo_id")
    usuario_id = data.get("usuario_id")

    if not pid:
        return jsonify({"erro": "id é obrigatório (ex: P001)"}), 400

    if Paciente.query.get(pid):
        return jsonify({"erro": "ID já existe"}), 409

    paciente = Paciente(
        id=pid,
        nome=nome,
        idade=idade,
        sexo_id=sexo_id,
        usuario_id=usuario_id,
    )

    db.session.add(paciente)
    db.session.commit()

    return jsonify({
        "id": paciente.id,
        "nome": paciente.nome,
        "exams": [],
    }), 201


@app.route("/api/pacientes/<id_paciente>", methods=["DELETE"])
def remover_paciente(id_paciente):
    paciente = Paciente.query.get(id_paciente)

    if not paciente:
        return jsonify({"mensagem": "Paciente não encontrado."}), 404

    db.session.delete(paciente)
    db.session.commit()

    return jsonify({"mensagem": f"Paciente {id_paciente} removido."})


# ---------------------------
# EXAMES
# ---------------------------

@app.route("/api/exames/<paciente_id>", methods=["GET"])
def listar_exames(paciente_id):
    paciente = Paciente.query.get(paciente_id)

    if not paciente:
        return jsonify({"erro": "Paciente não encontrado"}), 404

    exams = []

    for e in paciente.exames:
        exams.append({
            "examId": e.id,
            "pacienteId": e.paciente_id,
            "imagem_path": e.imagem_path,
            "original_filename": getattr(e, "original_filename", None),
            "resultado": e.resultado,
            "confianca": e.confianca,
            "model_name": getattr(e, "model_name", None),
            "model_version": getattr(e, "model_version", None),
            "processed_at": (
                e.processed_at.isoformat()
                if getattr(e, "processed_at", None)
                else None
            ),
            "processing_time": getattr(e, "processing_time", None),
            "error_message": getattr(e, "error_message", None),
            "data": e.created_at.strftime("%d/%m/%Y") if e.created_at else "—",
            "status": getattr(e, "status", None),
            "statusLabel": status_label(getattr(e, "status", None)),
        })

    return jsonify(exams)


@app.route("/api/exames/upload", methods=["POST"])
def upload_exame():
    paciente_id = (request.form.get("paciente_id") or "").strip()

    if not paciente_id:
        return jsonify({"erro": "paciente_id é obrigatório"}), 400

    paciente = Paciente.query.get(paciente_id)

    if not paciente:
        return jsonify({"erro": "Paciente não encontrado"}), 404

    if "file" not in request.files:
        return jsonify({"erro": "arquivo (file) é obrigatório"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"erro": "arquivo sem nome"}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "erro": f"Formato inválido. Use: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        }), 400

    exam_id = f"E{uuid4().hex[:12].upper()}"

    original_name = file.filename
    filename = secure_filename(file.filename)
    ext = filename.rsplit(".", 1)[1].lower()

    saved_name = f"{exam_id}.{ext}"
    saved_path = UPLOAD_DIR / saved_name

    file.save(saved_path)

    exame = Exame(
        id=exam_id,
        paciente_id=paciente_id,
        imagem_path=str(saved_path),
        original_filename=original_name,
        status="PENDING",
        resultado=None,
        confianca=None,
        model_name=None,
        model_version=None,
        processed_at=None,
        error_message=None,
    )

    db.session.add(exame)
    db.session.commit()

    try:
        process_exam_sync(exame.id)
    except Exception:
        pass

    exame = Exame.query.get(exame.id) or exame

    return jsonify({
        "examId": exame.id,
        "pacienteId": exame.paciente_id,
        "imagem_path": exame.imagem_path,
        "original_filename": getattr(exame, "original_filename", None),
        "status": getattr(exame, "status", None),
        "statusLabel": status_label(getattr(exame, "status", None)),
        "resultado": exame.resultado,
        "confianca": exame.confianca,
        "model_name": getattr(exame, "model_name", None),
        "model_version": getattr(exame, "model_version", None),
        "processed_at": (
            exame.processed_at.isoformat()
            if getattr(exame, "processed_at", None)
            else None
        ),
        "processing_time": getattr(exame, "processing_time", None),
        "error_message": getattr(exame, "error_message", None),
    }), 201


@app.route("/api/exames/<exam_id>", methods=["DELETE"])
def deletar_exame(exam_id):
    exame = Exame.query.get(exam_id)

    if not exame:
        return jsonify({"erro": "Exame não encontrado"}), 404

    try:
        if exame.imagem_path and os.path.exists(exame.imagem_path):
            os.remove(exame.imagem_path)
    except Exception:
        pass

    try:
        mask_path = UPLOAD_DIR / f"{exam_id}_mask.png"
        overlay_path = UPLOAD_DIR / f"{exam_id}_overlay.png"

        if mask_path.exists():
            mask_path.unlink()

        if overlay_path.exists():
            overlay_path.unlink()
    except Exception:
        pass

    db.session.delete(exame)
    db.session.commit()

    return jsonify({"mensagem": f"Exame {exam_id} removido."})


@app.route("/api/exames/<exam_id>/file", methods=["GET"])
def baixar_arquivo_exame(exam_id):
    exame = Exame.query.get(exam_id)

    if not exame or not exame.imagem_path:
        return jsonify({"erro": "Arquivo não encontrado"}), 404

    if not os.path.exists(exame.imagem_path):
        return jsonify({"erro": "Arquivo não existe no disco"}), 404

    return send_file(exame.imagem_path)


@app.route("/api/exames/<exam_id>/segmentar", methods=["POST"])
def segmentar_exame(exam_id):
    exame = Exame.query.get(exam_id)

    if not exame:
        return jsonify({"erro": "Exame não encontrado"}), 404

    if not exame.imagem_path or not os.path.exists(exame.imagem_path):
        return jsonify({"erro": "Imagem do exame não encontrada"}), 404

    try:
        mask = predict_segmentation(exame.imagem_path)
        mask = (mask > 0).astype(np.uint8)

        original = cv2.imread(exame.imagem_path)

        if original is None:
            return jsonify({"erro": "Falha ao ler imagem original"}), 500

        if mask.shape[:2] != original.shape[:2]:
            mask = cv2.resize(
                mask,
                (original.shape[1], original.shape[0]),
                interpolation=cv2.INTER_NEAREST,
            )

        correction_type, metrics = infer_correction_type(mask)

        mask_name = f"{exam_id}_mask.png"
        overlay_name = f"{exam_id}_overlay.png"

        mask_path = UPLOAD_DIR / mask_name
        overlay_path = UPLOAD_DIR / overlay_name

        cv2.imwrite(str(mask_path), mask.astype(np.uint8) * 255)

        overlay = original.copy()

        red_mask = np.zeros_like(original)
        red_mask[:, :, 2] = 255

        mask_bool = mask > 0

        overlay[mask_bool] = cv2.addWeighted(
            original[mask_bool],
            0.55,
            red_mask[mask_bool],
            0.45,
            0,
        )

        cv2.imwrite(str(overlay_path), overlay)

        return jsonify({
            "examId": exame.id,
            "maskUrl": f"/api/exames/{exam_id}/mask",
            "overlayUrl": f"/api/exames/{exam_id}/overlay",
            "correctionType": correction_type,
            "segmentationMetrics": metrics,
        }), 200

    except Exception as error:
        return jsonify({"erro": str(error)}), 500


@app.route("/api/exames/<exam_id>/mask", methods=["GET"])
def baixar_mascara_exame(exam_id):
    mask_path = UPLOAD_DIR / f"{exam_id}_mask.png"

    if not mask_path.exists():
        return jsonify({"erro": "Máscara não encontrada"}), 404

    return send_file(mask_path)


@app.route("/api/exames/<exam_id>/overlay", methods=["GET"])
def baixar_overlay_exame(exam_id):
    overlay_path = UPLOAD_DIR / f"{exam_id}_overlay.png"

    if not overlay_path.exists():
        return jsonify({"erro": "Overlay não encontrado"}), 404

    return send_file(overlay_path)