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
                <td>{{ c.fechaHora | date: 'short' }}</td>
                <td>{{ c.pacienteId.nombre }} {{ c.pacienteId.apellido }}</td>
                <td>Dr(a). {{ c.medicoId.nombre }} {{ c.medicoId.apellido }}</td>
                <td>{{ c.modalidad === 'teleconsulta' ? 'Teleconsulta 🎥' : 'Presencial' }}</td>
                <td><span class="badge" [attr.data-estado]="c.estado">{{ estadoLabel(c.estado) }}</span></td>
                <td class="actions">
                  @if (c.estado === 'reservada') {
                    <button class="btn-sm danger" (click)="cancelar(c)">Cancelar</button>
                  }
                  <a class="btn-sm" [routerLink]="['/facturar', c._id]">Facturar</a>
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
      .page__head { margin-bottom: 1rem; }
      .muted { color: #6b7280; font-size: .9rem; }
      .tbl { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
      .tbl th, .tbl td { text-align: left; padding: .7rem .8rem; border-bottom: 1px solid #f3f4f6; font-size: .9rem; }
      .tbl th { background: #f9fafb; color: #374151; }
      .actions { display: flex; gap: .4rem; }
      .btn-sm { padding: .35rem .7rem; background: #2563eb; color: #fff; border: 0; border-radius: 6px; cursor: pointer; text-decoration: none; font-size: .82rem; }
      .btn-sm.danger { background: #dc2626; }
      .badge { padding: .15rem .5rem; border-radius: 999px; font-size: .78rem; background: #e5e7eb; }
      .badge[data-estado='reservada'] { background: #dbeafe; color: #1e40af; }
      .badge[data-estado='atendida'] { background: #dcfce7; color: #166534; }
      .badge[data-estado='cancelada'] { background: #fee2e2; color: #991b1b; }
      .badge[data-estado='no_asistio'] { background: #fef3c7; color: #92400e; }
      .err { color: #b91c1c; }
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
      { reservada: 'Reservada', atendida: 'Atendida', cancelada: 'Cancelada', no_asistio: 'No asistió' }[
        e
      ] ?? e
    );
  }
}
