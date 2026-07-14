import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment } from '../../../core/models/appointment.model';

/** Recepción: vista de todas las citas, con cancelar y acceso a facturar. */
@Component({
  selector: 'app-recepcion-citas',
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="page">
      <header class="page__head">
        <h1>Citas</h1>
        <p class="muted">Todas las citas de la clínica.</p>
      </header>

      @if (error()) { <p class="err">{{ error() }}</p> }

      @if (loading()) {
        <p class="muted">Cargando…</p>
      } @else if (!citas().length) {
        <p class="muted">No hay citas registradas.</p>
      } @else {
        <table class="tbl">
          <thead>
            <tr>
              <th>Fecha y hora</th><th>Paciente</th><th>Médico</th>
              <th>Modalidad</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (c of citas(); track c._id) {
              <tr>
                <td>{{ c.fechaHora | date: 'short' : '-0500' }}</td>
                <td>{{ c.pacienteId.nombre }} {{ c.pacienteId.apellido }}</td>
                <td>Dr(a). {{ c.medicoId.nombre }} {{ c.medicoId.apellido }}</td>
                <td>{{ c.modalidad === 'teleconsulta' ? 'Teleconsulta 🎥' : 'Presencial' }}</td>
                <td><span class="badge" [attr.data-estado]="c.estado">{{ estadoLabel(c.estado) }}</span></td>
                <td class="actions">
                  @if (c.estado === 'reservada') {
                    <button class="btn-sm danger" (click)="cancelar(c)">Cancelar</button>
                  }
                  @if (c.estado !== 'cancelada' && c.estado !== 'no_asistio') {
                    <a class="btn-sm" [routerLink]="['/facturar', c._id]">Facturar</a>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; }
      .page__head { margin-bottom: 1.5rem; }
      .page__head h1 { margin: 0; color: var(--slate-900); }
      .muted { color: var(--slate-500); font-size: .9rem; }
      .tbl {
        width: 100%;
        border-collapse: collapse;
        background: var(--bg-surface);
        border: 1.5px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
      }
      .tbl th, .tbl td {
        text-align: left;
        padding: .7rem .8rem;
        border-bottom: 1px solid var(--border);
        font-size: .9rem;
      }
      .tbl th {
        background: var(--info-bg);
        color: var(--slate-700);
        font-weight: 600;
      }
      .tbl tr:hover { background: color-mix(in srgb, var(--brand) 10%, transparent); }
      .actions { display: flex; gap: .4rem; }
      .btn-sm {
        padding: .35rem .7rem;
        background: var(--brand);
        color: #fff;
        border: 0;
        border-radius: 8px;
        cursor: pointer;
        text-decoration: none;
        font-size: .82rem;
        font-weight: 600;
        transition: all 0.15s ease;
      }
      .btn-sm:hover { background: var(--brand-dark); transform: translateY(-1px); }
      .btn-sm.danger { background: #dc2626; }
      .btn-sm.danger:hover { background: #b91c1c; }
      .badge {
        padding: .15rem .5rem;
        border-radius: 999px;
        font-size: .78rem;
        font-weight: 600;
        background: var(--slate-200);
        color: var(--slate-600);
      }
      .badge[data-estado='reservada'] { background: var(--info-bg); color: var(--brand); }
      .badge[data-estado='atendida'] { background: var(--ok-bg); color: var(--ok-text); }
      .badge[data-estado='cancelada'] { background: var(--danger-bg); color: var(--danger-text); }
      .badge[data-estado='no_asistio'] { background: var(--warn-bg); color: var(--warn-text); }
      .badge[data-estado='vencida'] { background: var(--slate-200); color: var(--slate-600); }
      .err { color: var(--danger-text); font-weight: 600; }
    `,
  ],
})
export class RecepcionCitas {
  private appointments = inject(AppointmentService);

  readonly citas = signal<Appointment[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.appointments.list().subscribe({
      next: (c) => {
        this.citas.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  cancelar(c: Appointment): void {
    this.error.set(null);
    this.appointments.cancelar(c._id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err.error?.message ?? 'No se pudo cancelar la cita'),
    });
  }

  estadoLabel(e: string): string {
    return (
      {
        reservada: 'Reservada',
        atendida: 'Atendida',
        cancelada: 'Cancelada',
        no_asistio: 'No asistió',
        vencida: 'No realizada',
      }[e] ?? e
    );
  }
}
