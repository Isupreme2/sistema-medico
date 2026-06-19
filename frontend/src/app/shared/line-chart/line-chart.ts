import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { Chart, ChartDataset, registerables } from 'chart.js';

Chart.register(...registerables);

export interface SerieGrafica {
  label: string;
  data: (number | null)[];
  color: string;
}

@Component({
  selector: 'app-line-chart',
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
export class LineChart {
  readonly titulo = input<string>('');
  readonly labels = input<string[]>([]);
  readonly series = input<SerieGrafica[]>([]);

  private canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  constructor() {
    effect(() => {
      const canvas = this.canvasRef();
      const labels = this.labels();
      const series = this.series();
      if (!canvas) return;

      this.chart?.destroy();

      const datasets: ChartDataset<'line'>[] = series.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: s.color,
        backgroundColor: s.color + '33',
        tension: 0.3,
        spanGaps: true,
        pointRadius: 4,
      }));

      this.chart = new Chart(canvas.nativeElement, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: series.length > 1 } },
          scales: { y: { beginAtZero: false } },
        },
      });
    });
  }
}
