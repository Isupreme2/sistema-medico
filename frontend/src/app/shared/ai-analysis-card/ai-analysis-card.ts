import { Component, ChangeDetectionStrategy, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AiAnalysis, NivelRiesgo } from '../../core/models/ai-analysis.model';
import { AiAnalysisService } from '../../core/services/ai-analysis.service';

const LEVEL_COLORS: Record<NivelRiesgo, string> = {
  bajo: '#16a34a',
  medio: '#ca8a04',
  alto: '#dc2626',
};

@Component({
  selector: 'app-ai-analysis-card',
  imports: [],
  templateUrl: './ai-analysis-card.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './ai-analysis-card.scss',
})
export class AiAnalysisCard {
  private service = inject(AiAnalysisService);

  readonly pacienteId = input.required<string>();

  readonly loading = signal(false);
  readonly resultado = signal<AiAnalysis | null>(null);
  readonly error = signal<string | null>(null);

  analizar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.resultado.set(null);

    this.service.analizar(this.pacienteId()).subscribe({
      next: (res) => {
        this.resultado.set(res);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'No se pudo generar el análisis');
        this.loading.set(false);
      },
    });
  }

  nivelColor(nivel: NivelRiesgo): string {
    return LEVEL_COLORS[nivel];
  }

  barWidth(prob: number): number {
    return Math.round(Math.max(Math.min(prob, 100), 1));
  }
}
