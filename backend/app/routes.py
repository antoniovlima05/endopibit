from app import app
from flask import request, jsonify
from flask_cors import CORS

CORS(app)

# ===============================================================
#  AUTENTICAÇÃO
# ===============================================================

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json

    email = data.get("email")
    senha = data.get("senha")

    # MOCK DE LOGIN (aceita qualquer email/senha)
    return jsonify({
        "mensagem": "Login realizado com sucesso.",
        "token": "token_mock_123",
        "usuario": {
            "nome": "Usuário de Teste",
            "email": email
        }
    })


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json

    return jsonify({
        "mensagem": "Usuário registrado.",
        "usuario": data
    })


# ===============================================================
#  PACIENTES
# ===============================================================

# Lista TODOS os pacientes
@app.route("/api/pacientes", methods=["GET"])
def listar_pacientes():
    pacientes = [
        {"id": "P001", "nome": "Maria", "idade": 32, "sexo": "F"},
        {"id": "P002", "nome": "Ana", "idade": 29, "sexo": "F"}
    ]
    return jsonify(pacientes)


# Busca um paciente pelo ID
@app.route("/api/pacientes/<id_paciente>", methods=["GET"])
def buscar_paciente(id_paciente):
    paciente = {"id": id_paciente, "nome": "Paciente Mock", "idade": 30, "sexo": "F"}
    return jsonify(paciente)


# Cria paciente
@app.route("/api/pacientes", methods=["POST"])
def criar_paciente():
    data = request.json
    data["id"] = "P003"  # ID mockado

    return jsonify({
        "mensagem": "Paciente criado.",
        "paciente": data
    })


# Remove paciente
@app.route("/api/pacientes/<id_paciente>", methods=["DELETE"])
def remover_paciente(id_paciente):
    return jsonify({"mensagem": f"Paciente {id_paciente} removido."})


# ===============================================================
#  EXAMES (UPLOAD & LISTAGEM)
# ===============================================================

@app.route("/api/exames/upload", methods=["POST"])
def upload_exame():
    if "arquivo" not in request.files:
        return jsonify({"erro": "Nenhum arquivo enviado."}), 400

    arquivo = request.files["arquivo"]

    # MOCK
    return jsonify({
        "mensagem": "Arquivo recebido.",
        "nome_arquivo": arquivo.filename,
        "url": f"/storage/{arquivo.filename}"
    })


@app.route("/api/exames/<id_paciente>", methods=["GET"])
def listar_exames(id_paciente):
    exames = [
        {"imagem": "/storage/exame1.png", "resultado": "com_endometriose", "confianca": 0.92},
        {"imagem": "/storage/exame2.png", "resultado": "sem_endometriose", "confianca": 0.81}
    ]
    return jsonify(exames)


# ===============================================================
#  MODELOS IA (MOCK)
# ===============================================================

@app.route("/api/ia/classificar", methods=["POST"])
def classificar():
    # sem IA real, devolve valores aleatórios mockados
    return jsonify({
        "resultado": "com_endometriose",
        "confianca": 0.91
    })


@app.route("/api/ia/segmentar", methods=["POST"])
def segmentar():
    return jsonify({
        "mascara": "data:image/png;base64,AAAAAA_MOCK",
        "confianca": 0.87
    })


@app.route("/api/ia/analisar-exame", methods=["POST"])
def analisar_exame():
    data = request.json
    paciente = data.get("idPaciente", "desconhecido")

    # MOCK DE PIPELINE
    return jsonify({
        "idPaciente": paciente,
        "resultadoFinal": "com_endometriose",
        "confiancaMedia": 0.89,
        "classificacoes": [
            {
                "imagem": "/storage/img1.png",
                "resultado": "com_endometriose",
                "confianca": 0.92,
                "mascara": "/storage/mask1.png"
            },
            {
                "imagem": "/storage/img2.png",
                "resultado": "sem_endometriose",
                "confianca": 0.81,
                "mascara": "/storage/mask2.png"
            }
        ]
    })


# ===============================================================
#  TESTE
# ===============================================================

@app.route("/api/test", methods=["GET"])
def test():
    return jsonify({"mensagem": "API funcionando!"})
