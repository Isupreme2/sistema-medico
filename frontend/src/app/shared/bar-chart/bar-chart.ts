import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { ThemeService } from '../../core/services/theme.service';

Chart.register(...registerables);

@Component({
  selector: 'app-bar-chart',
  imports: [],
  template: `
    <div class="chart-card">
      <h4>{{ titulo() }}</h4>
      <div class="canvas-box">
        <canvas #canvas></canvas>
      </div>
    </div>
  `,
  styles: [
    `
      .chart-card {
        background: var(--bg-surface);
        border: 1.5px solid var(--border);
        border-radius: 12px;
        box-shadow: 0 2px 8px var(--shadow);
        padding: 1rem 1.1rem;
      }
      h4 {
        margin: 0 0 0.75rem;
        font-size: 0.92rem;
        color: var(--text-primary);
      }
      .canvas-box {
        position: relative;
        height: 220px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class BarChart {
  readonly titulo = input<string>('');
  readonly labels = input<string[]>([]);
  readonly data = input<number[]>([]);
  readonly colors = input<string[]>([]);

  private canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private theme = inject(ThemeService);
  private chart?: Chart;

  constructor() {
    effect(() => {
      const canvas = this.canvasRef();
      const labels = this.labels();
      const data = this.data();
      const colors = this.colors();
      this.theme.current(); // re-renderiza al cambiar de tema
      if (!canvas) return;

      const css = getComputedStyle(canvas.nativeElement);
      const tickColor = css.getPropertyValue('--text-muted').trim() || '#64748b';
      const gridColor = css.getPropertyValue('--border').trim() || '#e2e8f0';

      this.chart?.destroy();
      this.chart = new Chart(canvas.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: colors.length ? colors : '#2563eb',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0, color: tickColor },
              grid: { color: gridColor },
            },
            x: {
              ticks: { color: tickColor },
              grid: { color: gridColor },
            },
          },
        },
      });
    });
  }
}
