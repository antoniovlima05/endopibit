import os
from datetime import datetime
from pathlib import Path

from flask import request, jsonify
from werkzeug.utils import secure_filename

from . import app, db
from .models import Paciente, Exame

from flask import send_file

# 🔥 service layer (MVP sync)
# Você precisa criar esse arquivo conforme combinamos: backend/app/services_exame.py
from .services_exame import process_exam_sync


# Pasta onde os uploads vão ficar
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
                    "data": (e.created_at.strftime("%d/%m/%Y") if e.created_at else "—"),
                    "status": status_label(getattr(e, "status", None)),
                }
                for e in p.exames
            ]
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

    p = Paciente(id=pid, nome=nome, idade=idade, sexo_id=sexo_id, usuario_id=usuario_id)
    db.session.add(p)
    db.session.commit()

    return jsonify({"id": p.id, "nome": p.nome, "exams": []}), 201


@app.route("/api/pacientes/<id_paciente>", methods=["DELETE"])
def remover_paciente(id_paciente):
    p = Paciente.query.get(id_paciente)
    if not p:
        return jsonify({"mensagem": "Paciente não encontrado."}), 404

    db.session.delete(p)
    db.session.commit()
    return jsonify({"mensagem": f"Paciente {id_paciente} removido."})


# ---------------------------
# EXAMES
# ---------------------------

@app.route("/api/exames/<paciente_id>", methods=["GET"])
def listar_exames(paciente_id):
    p = Paciente.query.get(paciente_id)
    if not p:
        return jsonify({"erro": "Paciente não encontrado"}), 404

    exams = []
    for e in p.exames:
        exams.append({
            "examId": e.id,
            "pacienteId": e.paciente_id,
            "imagem_path": e.imagem_path,
            "original_filename": getattr(e, "original_filename", None),
            "resultado": e.resultado,
            "confianca": e.confianca,
            "model_name": getattr(e, "model_name", None),
            "model_version": getattr(e, "model_version", None),
            "processed_at": (e.processed_at.isoformat() if getattr(e, "processed_at", None) else None),
            "error_message": getattr(e, "error_message", None),
            "data": (e.created_at.strftime("%d/%m/%Y") if e.created_at else "—"),
            "status": status_label(getattr(e, "status", None)),
        })

    return jsonify(exams)


@app.route("/api/exames/upload", methods=["POST"])
def upload_exame():
    # form-data: paciente_id + file
    paciente_id = (request.form.get("paciente_id") or "").strip()
    if not paciente_id:
        return jsonify({"erro": "paciente_id é obrigatório"}), 400

    p = Paciente.query.get(paciente_id)
    if not p:
        return jsonify({"erro": "Paciente não encontrado"}), 404

    if "file" not in request.files:
        return jsonify({"erro": "arquivo (file) é obrigatório"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"erro": "arquivo sem nome"}), 400

    if not allowed_file(file.filename):
        return jsonify({"erro": f"Formato inválido. Use: {', '.join(sorted(ALLOWED_EXTENSIONS))}"}), 400

    # gera um ID simples pro exame (pode trocar por uuid depois)
    stamp = datetime.now().strftime("%Y%m%d%H%M%S")
    exam_id = f"E{stamp}"

    original_name = file.filename
    filename = secure_filename(file.filename)
    ext = filename.rsplit(".", 1)[1].lower()

    saved_name = f"{exam_id}.{ext}"
    saved_path = UPLOAD_DIR / saved_name
    file.save(saved_path)

    e = Exame(
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

    db.session.add(e)
    db.session.commit()

    # 🔥 dispara classificação automaticamente (MVP sync)
    # Depois a gente troca isso por fila (RQ/Redis) sem mexer no endpoint.
    try:
        process_exam_sync(e.id)
    except Exception:
        # o service já marca FAILED e salva error_message
        pass

    # recarrega para pegar status/result atualizado
    e = Exame.query.get(e.id) or e

    return jsonify({
        "examId": e.id,
        "pacienteId": e.paciente_id,
        "imagem_path": e.imagem_path,
        "original_filename": getattr(e, "original_filename", None),
        "status": getattr(e, "status", None),                 # status técnico
        "statusLabel": status_label(getattr(e, "status", None)),  # label UI
        "resultado": e.resultado,
        "confianca": e.confianca,
        "model_name": getattr(e, "model_name", None),
        "model_version": getattr(e, "model_version", None),
        "processed_at": (e.processed_at.isoformat() if getattr(e, "processed_at", None) else None),
        "error_message": getattr(e, "error_message", None),
    }), 201


@app.route("/api/exames/<exam_id>", methods=["DELETE"])
def deletar_exame(exam_id):
    e = Exame.query.get(exam_id)
    if not e:
        return jsonify({"erro": "Exame não encontrado"}), 404

    # tenta apagar arquivo do disco (se existir)
    try:
        if e.imagem_path and os.path.exists(e.imagem_path):
            os.remove(e.imagem_path)
    except Exception:
        pass

    db.session.delete(e)
    db.session.commit()
    return jsonify({"mensagem": f"Exame {exam_id} removido."})

@app.route("/api/exames/<exam_id>/file", methods=["GET"])
def baixar_arquivo_exame(exam_id):
    e = Exame.query.get(exam_id)
    if not e or not e.imagem_path:
        return jsonify({"erro": "Arquivo não encontrado"}), 404

    if not os.path.exists(e.imagem_path):
        return jsonify({"erro": "Arquivo não existe no disco"}), 404

    # serve a imagem para o frontend conseguir renderizar <img src="...">
    return send_file(e.imagem_path)

from flask import send_file
