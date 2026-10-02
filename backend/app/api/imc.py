from flask import Blueprint, jsonify

from app.api.esquemas import param_num
from app.services.perfil import clasificar_imc

bp = Blueprint("imc", __name__)

MENSAJES = {
    "BAJO_PESO": "Tu IMC está por debajo de lo saludable. Una rutina de fuerza te ayuda a ganar masa.",
    "NORMAL": "Tu IMC está en el rango saludable. ¡Sigue así!",
    "SOBREPESO": "Tu IMC indica sobrepeso. Con cardio suave y fuerza puedes mejorar paso a paso.",
    "OBESIDAD": "Tu IMC indica obesidad. Empieza con ejercicios de bajo impacto y consulta a un profesional.",
}


@bp.get("/imc")
def imc():
    peso = param_num("peso", float, minimo=20, maximo=350, obligatorio=True)
    estatura = param_num("estatura", float, minimo=100, maximo=250, obligatorio=True)
    valor = round(peso / ((estatura / 100) ** 2), 2)
    clasificacion = clasificar_imc(valor)
    return jsonify({"peso_kg": peso, "estatura_cm": estatura, "imc": valor, "clasificacion": clasificacion,
                    "mensaje": MENSAJES[clasificacion],
                    "aviso": "FitIA no reemplaza a un profesional de la salud."})
