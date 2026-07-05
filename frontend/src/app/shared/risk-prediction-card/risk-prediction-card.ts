import { Component, ChangeDetectionStrategy, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PredictionResponse, RiskLevel } from '../../core/models/prediction.model';
import { PredictionService } from '../../core/services/prediction.service';

const CATEGORY_LABELS: Record<string, string> = {
  cardiovascular: 'Cardiovascular',
  metabolico: 'Metabólico',
  respiratorio: 'Respiratorio',
};

const LEVEL_COLORS: Record<RiskLevel, string> = {
  bajo: '#16a34a',
  medio: '#ca8a04',
  alto: '#dc2626',
};

@Component({
  selector: 'app-risk-prediction-card',
  imports: [],
  templateUrl: './risk-prediction-card.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './risk-prediction-card.scss',
})
export class RiskPredictionCard {
  private predictionService = inject(PredictionService);

  readonly pacienteId = input.required<string>();

  readonly loading = signal(false);
  readonly resultado = signal<PredictionResponse | null>(null);
  readonly error = signal<string | null>(null);

  analizar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.resultado.set(null);

    this.predictionService.getPrediction(this.pacienteId()).subscribe({
      next: (res) => {
        this.resultado.set(res);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'No se pudo obtener la predicción');
        this.loading.set(false);
      },
    });
  }

  categoriaLabel(cat: string): string {
    return CATEGORY_LABELS[cat] ?? cat;
  }

  nivelColor(nivel: RiskLevel): string {
    return LEVEL_COLORS[nivel];
  }

  porcentajeDisplay(prob: number): string {
    if (prob === 0) return '0';
    const pct = prob * 100;
    if (pct < 0.1) return '<0.1';
    return pct.toFixed(1);
  }

  barWidth(prob: number): number {
    const pct = prob * 100;
    return Math.round(Math.max(pct, 0.5));
  }
}
