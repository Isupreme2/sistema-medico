import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RecordService } from '../../core/services/record.service';
import { PrescriptionService } from '../../core/services/prescription.service';
import { MedicalRecord, SignosVitales } from '../../core/models/record.model';
import { Prescription } from '../../core/models/prescription.model';
import { UserRole } from '../../core/models/user.model';
import { LineChart, SerieGrafica } from '../../shared/line-chart/line-chart';
import { RiskPredictionCard } from '../../shared/risk-prediction-card/risk-prediction-card';
import { AiAnalysisCard } from '../../shared/ai-analysis-card/ai-analysis-card';

interface ChartConfig {
  titulo: string;
  series: SerieGrafica[];
  tieneDatos: boolean;
}

@Component({
  selector: 'app-historial',
  imports: [DatePipe, RouterLink, LineChart, RiskPredictionCard, AiAnalysisCard],
  templateUrl: './historial.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './historial.scss',
})
export class Historial {
  private route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  private recordService = inject(RecordService);
  private prescriptionService = inject(PrescriptionService);

  readonly records = signal<MedicalRecord[]>([]);
  readonly recetas = signal<Prescription[]>([]);
  readonly loading = signal(true);

  /** El médico puede recetar desde una consulta; el paciente solo consulta. */
  readonly esMedico = this.auth.role() === UserRole.MEDICO;

  /** Si la ruta trae :id es el médico viendo a un paciente; si no, el paciente ve lo suyo. */
  readonly pacienteId =
    this.route.snapshot.paramMap.get('id') ?? this.auth.user()?._id ?? '';

  /** Recetas emitidas a partir de una consulta concreta (vínculo por historialId). */
  recetasDe(recordId: string): Prescription[] {
    return this.recetas().filter((r) => r.historialId === recordId);
  }

  descargar(receta: Prescription): void {
    this.prescriptionService.descargarPdf(receta);
  }

  /** Registros con vitales, en orden cronológico ascendente (para las gráficas). */
  private conVitales = computed(() =>
    [...this.records()]
      .filter((r) => r.signosVitales)
      .sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha)),
  );

  readonly labels = computed(() =>
    this.conVitales().map((r) => new Date(r.fecha).toLocaleDateString('es')),
  );

  private serie(key: keyof SignosVitales, label: string, color: string): SerieGrafica {
    return {
      label,
      color,
      data: this.conVitales().map((r) => r.signosVitales?.[key] ?? null),
    };
  }

  readonly charts = computed<ChartConfig[]>(() => {
    const algo = (s: SerieGrafica[]) => s.some((x) => x.data.some((d) => d !== null));
    const configs: ChartConfig[] = [
      { titulo: 'Peso (kg)', series: [this.serie('peso', 'Peso', '#2563eb')], tieneDatos: false },
      {
        titulo: 'Presión arterial (mmHg)',
        series: [
          this.serie('presionSistolica', 'Sistólica', '#dc2626'),
          this.serie('presionDiastolica', 'Diastólica', '#f59e0b'),
        ],
        tieneDatos: false,
      },
      {
        titulo: 'Frecuencia cardíaca (lpm)',
        series: [this.serie('frecuenciaCardiaca', 'FC', '#16a34a')],
        tieneDatos: false,
      },
      {
        titulo: 'Temperatura (°C)',
        series: [this.serie('temperatura', 'Temp', '#9333ea')],
        tieneDatos: false,
      },
      {
        titulo: 'Glucosa (mg/dL)',
        series: [this.serie('glucosa', 'Glucosa', '#0891b2')],
        tieneDatos: false,
      },
    ];
    return configs.map((c) => ({ ...c, tieneDatos: algo(c.series) }));
  });

  readonly chartsConDatos = computed(() => this.charts().filter((c) => c.tieneDatos));

  constructor() {
    this.recordService.listByPatient(this.pacienteId).subscribe({
      next: (r) => {
        this.records.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.prescriptionService.listByPatient(this.pacienteId).subscribe({
      next: (r) => this.recetas.set(r),
    });
  }
}
