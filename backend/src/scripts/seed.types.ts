export type RiskLevel = 'bajo' | 'medio' | 'alto';

export interface PatientRiskProfile {
  cardiovascular: RiskLevel;
  metabolico: RiskLevel;
  respiratorio: RiskLevel;
}

export interface SeedMedication {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}

export interface SeedVitals {
  peso?: number;
  talla?: number;
  presionSistolica?: number;
  presionDiastolica?: number;
  frecuenciaCardiaca?: number;
  temperatura?: number;
  glucosa?: number;
  saturacionO2?: number;
}

export interface SeedScheduleSlot {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface SeedDoctorInput {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono: string;
  especialidad: string;
  numeroColegiatura: string;
  duracionSlotMin: number;
}

export interface SeedPatientInput {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono: string;
  tipoDocumento: 'DNI';
  numeroDocumento: string;
  alergias: string[];
  profile: PatientRiskProfile;
}
