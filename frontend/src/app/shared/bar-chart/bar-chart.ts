import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';

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
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        padding: 1rem 1.1rem;
      }
      h4 {
        margin: 0 0 0.75rem;
        font-size: 0.92rem;
        color: #1e293b;
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
  private chart?: Chart;

  constructor() {
    effect(() => {
      const canvas = this.canvasRef();
      const labels = this.labels();
      const data = this.data();
      const colors = this.colors();
      if (!canvas) return;

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
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
      });
    });
  }
}
