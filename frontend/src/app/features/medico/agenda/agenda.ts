import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment, AppointmentStatus } from '../../../core/models/appointment.model';

@Component({
  selector: 'app-medico-agenda',
  imports: [DatePipe, RouterLink],
  templateUrl: './agenda.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../paciente/mis-citas/mis-citas.scss', './agenda.scss'],
})
export class MedicoAgenda {
  private service = inject(AppointmentService);

  readonly citas = signal<Appointment[]>([]);
  readonly loading = signal(true);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (c) => {
        this.citas.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  marcar(c: Appointment, estado: AppointmentStatus): void {
    this.service.actualizarEstado(c._id, estado).subscribe({ next: () => this.load() });
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
