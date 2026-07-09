import { Component, ChangeDetectionStrategy, effect, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AppointmentService } from '../../core/services/appointment.service';
import {
  AlternativosResponse,
  AlternativoConSlots,
  Slot,
} from '../../core/models/appointment.model';

@Component({
  selector: 'app-medicos-alternativos',
  imports: [],
  templateUrl: './medicos-alternativos.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './medicos-alternativos.scss',
})
export class MedicosAlternativos {
  private appointmentService = inject(AppointmentService);

  readonly medicoId = input.required<string>();
  readonly fecha = input.required<string>();
  readonly hora = input<string>();

  readonly seleccionar = output<{ medicoId: string; slot: Slot }>();

  readonly loading = signal(false);
  readonly data = signal<AlternativosResponse | null>(null);
  readonly error = signal<string | null>(null);

  private loadedMedicoId = '';
  private loadedFecha = '';

  constructor() {
    effect(() => {
      const mid = this.medicoId();
      const fec = this.fecha();
      if (mid && fec) this.cargar();
    });
  }

  cargar(): void {
    const mid = this.medicoId();
    const fec = this.fecha();
    if (!mid || !fec) return;
    if (mid === this.loadedMedicoId && fec === this.loadedFecha) return;
    this.loadedMedicoId = mid;
    this.loadedFecha = fec;

    this.loading.set(true);
    this.error.set(null);
    this.data.set(null);

    this.appointmentService
      .getAlternativos(mid, fec, this.hora() || undefined)
      .subscribe({
        next: (res) => {
          this.data.set(res);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(err.error?.message ?? 'No se pudieron cargar médicos alternativos');
          this.loading.set(false);
        },
      });
  }

  onSeleccionar(alt: AlternativoConSlots, slot: Slot): void {
    this.seleccionar.emit({ medicoId: alt.medico.usuarioId._id, slot });
  }
}
