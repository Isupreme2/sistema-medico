export type RiskCategory = 'cardiovascular' | 'metabolico' | 'respiratorio';
export type RiskLevel = 'bajo' | 'medio' | 'alto';
export type PredictionStatus = 'ok' | 'datos_insuficientes' | 'error_inferencia';

export interface CategoriaPrediccion {
  categoria: RiskCategory;
  probabilidad: number;
  nivel: RiskLevel;
  factores: string[];
}

export interface PredictionResponse {
  pacienteId: string;
  generadoEn: string;
  horizonte: 'proxima_visita';
  estado: PredictionStatus;
  categorias: CategoriaPrediccion[];
  disclaimer: string;
}
