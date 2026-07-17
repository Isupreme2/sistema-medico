export type NivelRiesgo = 'bajo' | 'medio' | 'alto';

export interface CategoriaRiesgo {
  nombre: string;
  probabilidad: number; // 0-100
  nivel: NivelRiesgo;
  justificacion: string;
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
  disclaimer: string;
}
