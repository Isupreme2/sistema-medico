export type NivelRiesgo = 'bajo' | 'medio' | 'alto';

export interface CategoriaRiesgo {
  nombre: string;
  probabilidad: number; // 0-100
  nivel: NivelRiesgo;
  justificacion: string;
}

/** Salida del modelo ML (XGBoost) que la IA contrasta. */
export interface MlResumen {
  estado: string;
  categorias: { categoria: string; probabilidad: number; nivel: string }[];
}

export interface AiAnalysis {
  pacienteId: string;
  generadoEn: string;
  modo: 'ia' | 'demo';
  modelo: string;
  estado: 'ok' | 'datos_insuficientes' | 'error';
  categorias: CategoriaRiesgo[];
  resumen: string;
  recomendaciones: string[];
  senalesAlarma: string[];
  /** Lectura de la IA sobre coincidencias/discrepancias con el ML. */
  concordanciaML: string;
  ml: MlResumen | null;
  disclaimer: string;
}
