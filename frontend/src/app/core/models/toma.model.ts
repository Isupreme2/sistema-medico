export type TomaEstado = 'pendiente' | 'enviada' | 'confirmada' | 'omitida';

export interface Toma {
  _id: string;
  recetaId: string;
  pacienteId: string;
  medIndex: number;
  codigoReceta: string;
  medicamento: string;
  concentracion?: string;
  cantidad?: string;
  unidad?: string;
  momento?: string;
  programadaEn: string;
  estado: TomaEstado;
  enviadaEn?: string;
}
