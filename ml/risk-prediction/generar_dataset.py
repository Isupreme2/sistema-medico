#!/usr/bin/env python3
"""
Fase 1 — Generación de dataset sintético para predicción de riesgo clínico.

Lee feature-schema.json como fuente de verdad, usa especialidades (33) y tipos
de cita (4) de la BD como contexto generativo, y produce dos salidas:

  1. synthetic-risk-dataset.csv   — 5000 filas, 21 features + 6 columnas target
  2. synthetic-medical-histories.jsonl — historiales simulados para auditoría

Regeneración:
    cd ml/risk-prediction && python generar_dataset.py
"""

import csv
import json
import os
import random
from collections import Counter
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Any

SEED = 42
NUM_PATIENTS = 5000
HISTORY_MONTHS = 6
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Carga de contratos ──────────────────────────────────────────────────────

with open(os.path.join(BASE_DIR, "feature-schema.json")) as f:
    SCHEMA = json.load(f)

FEATURE_NAMES = [ft["name"] for ft in SCHEMA["features"]]
RISK_CATEGORIES = SCHEMA["riskCategories"]
KEYWORDS = SCHEMA["controlledKeywords"]
LEVELS = {lvl["level"]: lvl for lvl in SCHEMA["riskLevels"]}

# Umbrales del schema
BAJO_MAX = LEVELS["bajo"]["maxExclusive"]
MEDIO_MAX = LEVELS["medio"]["maxExclusive"]

# ── Catálogos del sistema (de la BD) ────────────────────────────────────────

ESPECIALIDADES = [
    "Medicina General", "Medicina Interna", "Medicina Familiar", "Pediatría",
    "Ginecología y Obstetricia", "Cardiología", "Cardiología Intervencionista",
    "Dermatología", "Endocrinología", "Gastroenterología", "Geriatría",
    "Hematología", "Infectología", "Nefrología", "Neumología", "Neurología",
    "Nutrición", "Oftalmología", "Oncología", "Odontología",
    "Otorrinolaringología", "Psiquiatría", "Psicología", "Reumatología",
    "Traumatología y Ortopedia", "Urología", "Cirugía General",
    "Cirugía Plástica", "Anestesiología", "Radiología", "Patología",
    "Fisioterapia y Rehabilitación", "Urgencias y Emergencias",
]

TIPOS_CITA = ["Consulta general", "Control", "Procedimiento", "Psicologia"]

# Especialidades con sesgo por categoría de riesgo
ESP_CARDIO = {"Cardiología", "Cardiología Intervencionista", "Medicina Interna"}
ESP_METABOLICO = {"Endocrinología", "Nutrición"}
ESP_RESPIRATORIO = {"Neumología", "Urgencias y Emergencias"}
ESP_NEUTRA = set(ESPECIALIDADES) - ESP_CARDIO - ESP_METABOLICO - ESP_RESPIRATORIO

# ── Motivos y diagnósticos sintéticos por categoría ─────────────────────────

MOTIVOS_GENERALES = [
    "Control de rutina", "Malestar general", "Dolor de cabeza",
    "Dolor abdominal", "Fiebre", "Mareos", "Fatiga", "Náuseas",
    "Dolor lumbar", "Dolor articular",
]

MOTIVOS_CARDIO = [
    "Presión alta", "Dolor torácico", "Palpitaciones", "Taquicardia",
    "Hipertensión arterial",
]

MOTIVOS_METABOLICO = [
    "Control de diabetes", "Glucosa elevada", "Sobrepeso",
    "Obesidad", "Hiperglucemia",
]

MOTIVOS_RESPIRATORIO = [
    "Tos persistente", "Dificultad respiratoria", "Disnea",
    "Asma", "Bronquitis",
]

DIAGNOSTICOS_GENERALES = [
    "Paciente en condición estable", "Sin hallazgos patológicos significativos",
    "Infección respiratoria alta", "Gastroenteritis aguda",
    "Cefalea tensional", "Lumbalgia mecánica",
]

DIAGNOSTICOS_CARDIO = [
    "Hipertensión arterial esencial", "Cardiopatía hipertensiva",
    "Taquicardia sinusal", "Riesgo cardiovascular elevado",
]

DIAGNOSTICOS_METABOLICO = [
    "Diabetes mellitus tipo 2", "Síndrome metabólico",
    "Obesidad grado I", "Dislipidemia mixta",
]

DIAGNOSTICOS_RESPIRATORIO = [
    "Asma bronquial", "EPOC estable", "Bronquitis aguda",
    "Insuficiencia respiratoria leve",
]

NOTAS_GENERALES = [
    "Paciente refiere mejoría con tratamiento indicado",
    "Se ajusta dosis de medicación actual",
    "Se solicita exámenes de laboratorio de control",
    "Paciente refiere cumplir con tratamiento",
    "Se indica continuar con plan actual y retorno en 3 meses",
]

# ── Funciones de generación clínica ─────────────────────────────────────────

rng = random.Random(SEED)


def generar_signos_vitales(perfil: str) -> dict:
    presion_sistolica = {
        "sano": (100, 120),
        "bajo": (110, 130),
        "medio": (120, 150),
        "alto": (140, 180),
    }[perfil]
    presion_diastolica = {
        "sano": (60, 80),
        "bajo": (65, 85),
        "medio": (70, 95),
        "alto": (80, 110),
    }[perfil]

    glucosa = {
        "sano": (70, 100),
        "bajo": (75, 110),
        "medio": (90, 140),
        "alto": (110, 200),
    }[perfil]

    imc = {
        "sano": (18.5, 25.0),
        "bajo": (20.0, 27.0),
        "medio": (24.0, 32.0),
        "alto": (28.0, 40.0),
    }[perfil]

    fc = {
        "sano": (60, 80),
        "bajo": (62, 85),
        "medio": (65, 95),
        "alto": (70, 110),
    }[perfil]

    sat_o2 = {
        "sano": (96, 100),
        "bajo": (95, 99),
        "medio": (92, 97),
        "alto": (85, 95),
    }[perfil]

    temp_max = {
        "sano": (36.0, 37.0),
        "bajo": (36.0, 37.5),
        "medio": (36.5, 38.0),
        "alto": (36.5, 39.0),
    }[perfil]

    missing = rng.random() < 0.08
    if missing:
        return None

    return {
        "presionSistolica": round(rng.uniform(*presion_sistolica), 1),
        "presionDiastolica": round(rng.uniform(*presion_diastolica), 1),
        "frecuenciaCardiaca": round(rng.uniform(*fc), 1),
        "glucosa": round(rng.uniform(*glucosa), 1),
        "peso": round(rng.uniform(50, 120), 1),
        "talla": round(rng.uniform(1.50, 1.90), 2),
        "saturacionO2": round(rng.uniform(*sat_o2), 1),
        "temperatura": round(rng.uniform(*temp_max), 1),
    }


def seleccionar_especialidad(perfil: str) -> str:
    peso = {"sano": 0.05, "bajo": 0.15, "medio": 0.25, "alto": 0.35}[perfil]

    categorias = []
    if perfil == "alto" or (perfil in ("medio", "bajo") and rng.random() < peso):
        cat = rng.choice(RISK_CATEGORIES)
        if cat == "cardiovascular":
            categorias = list(ESP_CARDIO)
        elif cat == "metabolico":
            categorias = list(ESP_METABOLICO)
        elif cat == "respiratorio":
            categorias = list(ESP_RESPIRATORIO)
    else:
        categorias = list(ESP_NEUTRA)

    return rng.choice(categorias) if categorias else rng.choice(list(ESP_NEUTRA))


def seleccionar_tipo_cita(perfil: str) -> str:
    if perfil == "alto":
        pesos = [0.30, 0.50, 0.15, 0.05]
    elif perfil == "medio":
        pesos = [0.40, 0.40, 0.15, 0.05]
    elif perfil == "bajo":
        pesos = [0.50, 0.30, 0.15, 0.05]
    else:
        pesos = [0.60, 0.20, 0.15, 0.05]
    return rng.choices(TIPOS_CITA, weights=pesos)[0]


def seleccionar_motivo(especialidad: str) -> str:
    if especialidad in ESP_CARDIO:
        pool = MOTIVOS_CARDIO + MOTIVOS_GENERALES
        pesos = [0.5] * len(MOTIVOS_CARDIO) + [0.5 / len(MOTIVOS_GENERALES)] * len(MOTIVOS_GENERALES)
    elif especialidad in ESP_METABOLICO:
        pool = MOTIVOS_METABOLICO + MOTIVOS_GENERALES
        pesos = [0.5] * len(MOTIVOS_METABOLICO) + [0.5 / len(MOTIVOS_GENERALES)] * len(MOTIVOS_GENERALES)
    elif especialidad in ESP_RESPIRATORIO:
        pool = MOTIVOS_RESPIRATORIO + MOTIVOS_GENERALES
        pesos = [0.5] * len(MOTIVOS_RESPIRATORIO) + [0.5 / len(MOTIVOS_GENERALES)] * len(MOTIVOS_GENERALES)
    else:
        pool = MOTIVOS_GENERALES
        pesos = [1.0 / len(pool)] * len(pool)
    return rng.choices(pool, weights=pesos)[0]


def seleccionar_diagnostico(especialidad: str) -> str:
    if especialidad in ESP_CARDIO:
        pool = DIAGNOSTICOS_CARDIO + DIAGNOSTICOS_GENERALES
    elif especialidad in ESP_METABOLICO:
        pool = DIAGNOSTICOS_METABOLICO + DIAGNOSTICOS_GENERALES
    elif especialidad in ESP_RESPIRATORIO:
        pool = DIAGNOSTICOS_RESPIRATORIO + DIAGNOSTICOS_GENERALES
    else:
        pool = DIAGNOSTICOS_GENERALES
    return rng.choice(pool)


def contar_keywords(texto: str, keyword_list: list[str]) -> int:
    texto_lower = texto.lower()
    return sum(1 for kw in keyword_list if kw.lower() in texto_lower)


# ── Datos del paciente sintético ─────────────────────────────────────────────

@dataclass
class ConsultaSintetica:
    fecha: str
    tipoCita: str
    especialidad: str
    signosVitales: dict | None
    motivo: str
    diagnostico: str
    notas: str


@dataclass
class PacienteSintetico:
    pacienteId: str
    perfil: str
    consultas: list[ConsultaSintetica] = field(default_factory=list)

    def ultima_fecha(self) -> datetime | None:
        if not self.consultas:
            return None
        return max(datetime.fromisoformat(c.fecha) for c in self.consultas)

    def resumen_features(self) -> dict[str, Any]:
        total = len(self.consultas)
        if total == 0:
            return {name: None for name in FEATURE_NAMES}

        con_signos = sum(1 for c in self.consultas if c.signosVitales is not None)
        fechas = sorted(datetime.fromisoformat(c.fecha) for c in self.consultas)
        dias_ultima = (datetime.now() - fechas[-1]).days if fechas else None

        intervalos = []
        for i in range(1, len(fechas)):
            intervalos.append((fechas[i] - fechas[i - 1]).days)
        intervalo_prom = round(sum(intervalos) / len(intervalos), 1) if intervalos else None

        sistolicas = []
        diastolicas = []
        frecuencias = []
        glucosas = []
        imcs = []
        saturaciones = []
        temperaturas = []

        for c in self.consultas:
            if c.signosVitales:
                sv = c.signosVitales
                sistolicas.append(sv["presionSistolica"])
                diastolicas.append(sv["presionDiastolica"])
                frecuencias.append(sv["frecuenciaCardiaca"])
                glucosas.append(sv["glucosa"])
                saturaciones.append(sv["saturacionO2"])
                temperaturas.append(sv["temperatura"])
                if sv.get("peso") and sv.get("talla"):
                    imcs.append(round(sv["peso"] / (sv["talla"] ** 2), 1))

        conteo_cardio = sum(
            contar_keywords(f"{c.motivo} {c.diagnostico} {c.notas}", KEYWORDS["cardiovascular"])
            for c in self.consultas
        )
        conteo_metabolico = sum(
            contar_keywords(f"{c.motivo} {c.diagnostico} {c.notas}", KEYWORDS["metabolico"])
            for c in self.consultas
        )
        conteo_respiratorio = sum(
            contar_keywords(f"{c.motivo} {c.diagnostico} {c.notas}", KEYWORDS["respiratorio"])
            for c in self.consultas
        )

        def ultimo(arr):
            return arr[-1] if arr else None

        def promedio(arr):
            return round(sum(arr) / len(arr), 1) if arr else None

        return {
            "total_consultas": total,
            "consultas_con_signos_vitales": con_signos,
            "dias_desde_ultima_consulta": dias_ultima,
            "intervalo_promedio_dias_consultas": intervalo_prom,
            "presion_sistolica_ultima": ultimo(sistolicas),
            "presion_sistolica_promedio": promedio(sistolicas),
            "presion_sistolica_maxima": round(max(sistolicas), 1) if sistolicas else None,
            "presion_diastolica_ultima": ultimo(diastolicas),
            "presion_diastolica_promedio": promedio(diastolicas),
            "frecuencia_cardiaca_ultima": ultimo(frecuencias),
            "frecuencia_cardiaca_promedio": promedio(frecuencias),
            "glucosa_ultima": ultimo(glucosas),
            "glucosa_promedio": promedio(glucosas),
            "glucosa_maxima": round(max(glucosas), 1) if glucosas else None,
            "imc_ultimo": ultimo(imcs),
            "saturacion_o2_ultima": ultimo(saturaciones),
            "saturacion_o2_minima": round(min(saturaciones), 1) if saturaciones else None,
            "temperatura_maxima": round(max(temperaturas), 1) if temperaturas else None,
            "conteo_keywords_cardiovascular": conteo_cardio,
            "conteo_keywords_metabolico": conteo_metabolico,
            "conteo_keywords_respiratorio": conteo_respiratorio,
        }


# ── Generación de labels sintéticos mediante reglas clínicas ───────────────

def compute_risk_probabilidad(features: dict, categoria: str) -> float:
    prob = 0.0

    if features["total_consultas"] is None or features["total_consultas"] == 0:
        return 0.0

    conteo_key = f"conteo_keywords_{categoria}"
    conteo = features.get(conteo_key, 0) or 0

    if conteo >= 5:
        prob += 0.35
    elif conteo >= 3:
        prob += 0.20
    elif conteo >= 1:
        prob += 0.10

    if categoria == "cardiovascular":
        sist_ult = features.get("presion_sistolica_ultima")
        syst_prom = features.get("presion_sistolica_promedio")
        fc_ult = features.get("frecuencia_cardiaca_ultima")

        if sist_ult and sist_ult >= 160:
            prob += 0.25
        elif sist_ult and sist_ult >= 140:
            prob += 0.15
        elif syst_prom and syst_prom >= 135:
            prob += 0.10

        if fc_ult and fc_ult >= 100:
            prob += 0.10
        elif fc_ult and fc_ult >= 90:
            prob += 0.05

        if features.get("glucosa_ultima") and features["glucosa_ultima"] >= 126:
            prob += 0.10

    elif categoria == "metabolico":
        gluc_ult = features.get("glucosa_ultima")
        gluc_prom = features.get("glucosa_promedio")
        gluc_max = features.get("glucosa_maxima")
        imc = features.get("imc_ultimo")

        if gluc_ult and gluc_ult >= 200:
            prob += 0.30
        elif gluc_ult and gluc_ult >= 126:
            prob += 0.20
        elif gluc_prom and gluc_prom >= 110:
            prob += 0.10

        if gluc_max and gluc_max >= 180:
            prob += 0.10

        if imc and imc >= 35:
            prob += 0.20
        elif imc and imc >= 30:
            prob += 0.10
        elif imc and imc >= 25:
            prob += 0.05

        sist_ult = features.get("presion_sistolica_ultima")
        if sist_ult and sist_ult >= 140:
            prob += 0.05

    elif categoria == "respiratorio":
        sat_ult = features.get("saturacion_o2_ultima")
        sat_min = features.get("saturacion_o2_minima")
        temp_max = features.get("temperatura_maxima")

        if sat_ult and sat_ult <= 90:
            prob += 0.30
        elif sat_ult and sat_ult <= 94:
            prob += 0.15

        if sat_min and sat_min <= 88:
            prob += 0.15
        elif sat_min and sat_min <= 93:
            prob += 0.10

        if temp_max and temp_max >= 38.5:
            prob += 0.15
        elif temp_max and temp_max >= 37.5:
            prob += 0.05

        fc_ult = features.get("frecuencia_cardiaca_ultima")
        if fc_ult and fc_ult >= 100:
            prob += 0.05

    # El perfil base suma variabilidad
    perfil = getattr(compute_risk_probabilidad, "_perfil_actual", "sano")
    base = {"sano": 0.0, "bajo": 0.05, "medio": 0.10, "alto": 0.20}
    prob += base.get(perfil, 0.0)

    prob += rng.uniform(-0.05, 0.05)
    prob = max(0.0, min(1.0, prob))

    return round(prob, 4)


def nivel_desde_probabilidad(prob: float) -> str:
    if prob >= MEDIO_MAX:
        return "alto"
    elif prob >= BAJO_MAX:
        return "medio"
    return "bajo"


# ── Generación de historiales ───────────────────────────────────────────────

def generar_paciente(paciente_id: int) -> PacienteSintetico:
    perfiles = ["sano", "sano", "sano", "bajo", "bajo", "medio", "alto"]
    perfil = rng.choice(perfiles)

    paciente = PacienteSintetico(
        pacienteId=f"SYN-{paciente_id:05d}",
        perfil=perfil,
    )

    num_consultas = {
        "sano": rng.randint(1, 4),
        "bajo": rng.randint(2, 6),
        "medio": rng.randint(3, 8),
        "alto": rng.randint(4, 12),
    }[perfil]

    fin = datetime.now()
    inicio = fin - timedelta(days=HISTORY_MONTHS * 30)
    intervalo_base = (fin - inicio).days / max(num_consultas, 1)
    fechas: list[datetime] = []
    fecha_actual = inicio + timedelta(days=rng.randint(0, 14))
    for _ in range(num_consultas):
        if fecha_actual > fin:
            break
        fechas.append(fecha_actual)
        gap = int(intervalo_base * rng.uniform(0.5, 1.8))
        fecha_actual += timedelta(days=max(gap, 1))

    for fecha in fechas:
        especialidad = seleccionar_especialidad(perfil)
        tipo_cita = seleccionar_tipo_cita(perfil)

        signos = generar_signos_vitales(perfil)

        # Un 12% de las consultas no tiene signos vitales
        if signos and rng.random() < 0.12:
            signos = None

        motivo = seleccionar_motivo(especialidad)
        diagnostico = seleccionar_diagnostico(especialidad)
        notas = rng.choice(NOTAS_GENERALES)

        if signos is None and rng.random() < 0.5:
            motivo = rng.choice(MOTIVOS_GENERALES)
            diagnostico = rng.choice(DIAGNOSTICOS_GENERALES)

        consulta = ConsultaSintetica(
            fecha=fecha.isoformat(),
            tipoCita=tipo_cita,
            especialidad=especialidad,
            signosVitales=signos,
            motivo=motivo,
            diagnostico=diagnostico,
            notas=notas,
        )
        paciente.consultas.append(consulta)

    return paciente


def generar_dataset():
    patients: list[PacienteSintetico] = []
    for i in range(NUM_PATIENTS):
        patients.append(generar_paciente(i + 1))

    # ── Construir CSV ───────────────────────────────────────────────────────
    csv_path = os.path.join(BASE_DIR, "synthetic-risk-dataset.csv")
    csv_columns = FEATURE_NAMES + [
        "target_cardiovascular", "target_metabolico", "target_respiratorio",
        "nivel_cardiovascular", "nivel_metabolico", "nivel_respiratorio",
    ]

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=csv_columns)
        writer.writeheader()

        for p in patients:
            features = p.resumen_features()

            compute_risk_probabilidad._perfil_actual = p.perfil
            prob_cv = compute_risk_probabilidad(features, "cardiovascular")
            prob_met = compute_risk_probabilidad(features, "metabolico")
            prob_resp = compute_risk_probabilidad(features, "respiratorio")

            row = {**features,
                   "target_cardiovascular": prob_cv,
                   "target_metabolico": prob_met,
                   "target_respiratorio": prob_resp,
                   "nivel_cardiovascular": nivel_desde_probabilidad(prob_cv),
                   "nivel_metabolico": nivel_desde_probabilidad(prob_met),
                   "nivel_respiratorio": nivel_desde_probabilidad(prob_resp)}
            writer.writerow(row)

    # ── Construir JSONL ─────────────────────────────────────────────────────
    jsonl_path = os.path.join(BASE_DIR, "synthetic-medical-histories.jsonl")

    with open(jsonl_path, "w", encoding="utf-8") as f:
        for p in patients:
            record = {
                "pacienteId": p.pacienteId,
                "perfil": p.perfil,
                "totalConsultas": len(p.consultas),
                "consultas": [asdict(c) for c in p.consultas],
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    return csv_path, jsonl_path


# ── Validación ──────────────────────────────────────────────────────────────

def validar_dataset(csv_path: str, jsonl_path: str) -> list[str]:
    errores: list[str] = []

    # 1. Features esperadas
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames or []
        for feat in FEATURE_NAMES:
            if feat not in header:
                errores.append(f"Feature faltante en CSV: {feat}")

        cols_target = ["target_cardiovascular", "target_metabolico", "target_respiratorio"]
        cols_nivel = ["nivel_cardiovascular", "nivel_metabolico", "nivel_respiratorio"]
        for col in cols_target + cols_nivel:
            if col not in header:
                errores.append(f"Columna target faltante en CSV: {col}")

        # 2. Filas
        rows = list(reader)
        if len(rows) != NUM_PATIENTS:
            errores.append(f"Cantidad de filas: esperado {NUM_PATIENTS}, obtenido {len(rows)}")

        # 3. Probabilidades en [0, 1]
        for i, row in enumerate(rows):
            for col in cols_target:
                val = float(row[col])
                if val < 0 or val > 1:
                    errores.append(f"Fila {i}: {col}={val} fuera de [0, 1]")

        # 4. Niveles respetan umbrales
        niveles_validos = {"bajo", "medio", "alto"}
        for i, row in enumerate(rows):
            for col in cols_nivel:
                if row[col] not in niveles_validos:
                    errores.append(f"Fila {i}: {col}={row[col]} no es válido")

        # 5. Diversidad de niveles
        stats: dict[str, Counter] = {}
        for col in cols_nivel:
            stats[col] = Counter()
        for row in rows:
            for col in cols_nivel:
                stats[col][row[col]] += 1

        for col, counter in stats.items():
            for nivel in niveles_validos:
                if counter.get(nivel, 0) == 0:
                    errores.append(f"{col}: sin pacientes en nivel '{nivel}'")
        for col, counter in stats.items():
            total = sum(counter.values())
            for nivel in niveles_validos:
                pct = counter.get(nivel, 0) / total * 100
                if pct < 1.0:
                    errores.append(f"{col}: nivel '{nivel}' tiene solo {pct:.1f}% (< 1%)")

    # 6. JSONL trazabilidad
    with open(jsonl_path, encoding="utf-8") as f:
        lines = f.readlines()

    if len(lines) != NUM_PATIENTS:
        errores.append(f"JSONL: esperado {NUM_PATIENTS} líneas, obtenido {len(lines)}")

    for i, line in enumerate(lines):
        rec = json.loads(line)
        if "pacienteId" not in rec or "consultas" not in rec:
            errores.append(f"JSONL línea {i}: faltan campos requeridos")
            continue
        c = rec["consultas"]
        if isinstance(c, list):
            for j, consulta in enumerate(c):
                for campo in ("fecha", "tipoCita", "especialidad", "motivo"):
                    if campo not in consulta:
                        errores.append(f"JSONL {i}, consulta {j}: falta '{campo}'")

    return errores


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    print("=== Generación de dataset sintético — Fase 1 ===")
    print(f"Semilla: {SEED}")
    print(f"Pacientes: {NUM_PATIENTS}")
    print(f"Historial: {HISTORY_MONTHS} meses")
    print()

    csv_path, jsonl_path = generar_dataset()
    print(f"CSV:  {csv_path}")
    print(f"JSONL: {jsonl_path}")
    print()

    csv_size = os.path.getsize(csv_path)
    jsonl_size = os.path.getsize(jsonl_path)
    print(f"Tamaño CSV:  {csv_size:,} bytes")
    print(f"Tamaño JSONL: {jsonl_size:,} bytes")
    print()

    print("=== Validación ===")
    errores = validar_dataset(csv_path, jsonl_path)
    if errores:
        print(f"\n❌ {len(errores)} error(es):")
        for err in errores:
            print(f"  - {err}")
    else:
        print("✅ Todas las validaciones pasaron.")

    print()
    print("=== Estadísticas rápidas ===")
    import csv as csv_module
    with open(csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv_module.DictReader(f))
    total = len(rows)
    for cat in RISK_CATEGORIES:
        col = f"nivel_{cat}"
        c = Counter(r[col] for r in rows)
        print(f"  {cat}: bajo={c['bajo']} ({c['bajo']/total*100:.1f}%), "
              f"medio={c['medio']} ({c['medio']/total*100:.1f}%), "
              f"alto={c['alto']} ({c['alto']/total*100:.1f}%)")


if __name__ == "__main__":
    main()
