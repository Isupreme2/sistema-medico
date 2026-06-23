import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment } from '../../../core/models/appointment.model';

@Component({
  selector: 'app-mis-citas',
  imports: [DatePipe, RouterLink],
  templateUrl: './mis-citas.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './mis-citas.scss',
})
export class MisCitas {
  private service = inject(AppointmentService);

  readonly citas = signal<Appointment[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

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

  cancelar(c: Appointment): void {
    this.error.set(null);
    this.service.cancelar(c._id).subscribe({
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
