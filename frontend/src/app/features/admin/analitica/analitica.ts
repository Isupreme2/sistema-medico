import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { Overview } from '../../../core/models/analytics.model';
import { LineChart, SerieGrafica } from '../../../shared/line-chart/line-chart';
import { BarChart } from '../../../shared/bar-chart/bar-chart';

const ESTADO_LABEL: Record<string, string> = {
  reservada: 'Reservadas',
  atendida: 'Atendidas',
  cancelada: 'Canceladas',
  no_asistio: 'No asistió',
};
const ESTADO_COLOR: Record<string, string> = {
  reservada: '#2563eb',
  atendida: '#16a34a',
  cancelada: '#dc2626',
  no_asistio: '#ca8a04',
};

@Component({
  selector: 'app-analitica',
  imports: [LineChart, BarChart],
  templateUrl: './analitica.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './analitica.scss',
})
export class Analitica {
  private service = inject(AnalyticsService);

  readonly data = signal<Overview | null>(null);
  readonly loading = signal(true);

  constructor() {
    this.service.overview().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // --- Citas por estado (barras) ---
  readonly estadoLabels = computed(() =>
    Object.keys(this.data()?.citasPorEstado ?? {}).map((e) => ESTADO_LABEL[e] ?? e),
  );
  readonly estadoData = computed(() => Object.values(this.data()?.citasPorEstado ?? {}));
  readonly estadoColors = computed(() =>
    Object.keys(this.data()?.citasPorEstado ?? {}).map((e) => ESTADO_COLOR[e] ?? '#64748b'),
  );

  // --- Citas por día (línea) ---
  readonly diaLabels = computed(() =>
    (this.data()?.citasPorDia ?? []).map((d) => d.fecha.slice(5)),
  );
  readonly diaSeries = computed<SerieGrafica[]>(() => [
    {
      label: 'Citas',
      data: (this.data()?.citasPorDia ?? []).map((d) => d.count),
      color: '#2563eb',
    },
  ]);

  soles(n: number | undefined): string {
    return 'S/ ' + (n ?? 0).toFixed(2);
  }
}
