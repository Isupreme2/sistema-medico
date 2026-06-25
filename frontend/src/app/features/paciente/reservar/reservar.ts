import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MedicoService } from '../../../core/services/medico.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { SocketService } from '../../../core/services/socket.service';
import { MedicoProfile } from '../../../core/models/medico.model';
import { AppointmentModality, Slot } from '../../../core/models/appointment.model';

/** Fecha de hoy en formato YYYY-MM-DD según la zona horaria LOCAL (no UTC). */
function hoyLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-reservar',
  imports: [],
  templateUrl: './reservar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './reservar.scss',
})
export class Reservar {
  private medicoService = inject(MedicoService);
  private appointmentService = inject(AppointmentService);
  private socket = inject(SocketService);
  private destroyRef = inject(DestroyRef);

  readonly medicos = signal<MedicoProfile[]>([]);
  readonly medicoId = signal<string>('');
  readonly fecha = signal<string>(hoyLocal());
  readonly modalidad = signal<AppointmentModality>('presencial');
  readonly slots = signal<Slot[]>([]);
  readonly loading = signal(false);
  readonly msg = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  private socketSub?: Subscription;

  constructor() {
    this.medicoService
      .list(true)
      .pipe(takeUntilDestroyed())
      .subscribe((m) => {
        this.medicos.set(m);
        if (m.length && !this.medicoId()) {
          this.onMedicoChange(m[0].usuarioId._id);
        }
      });
  }

  onMedicoChange(id: string): void {
    this.medicoId.set(id);
    this.cargarDisponibilidad();
    this.suscribirTiempoReal(id);
  }

  onFechaChange(fecha: string): void {
    this.fecha.set(fecha);
    this.cargarDisponibilidad();
  }

  cargarDisponibilidad(): void {
    if (!this.medicoId() || !this.fecha()) return;
    this.loading.set(true);
    this.error.set(null);
    this.appointmentService.disponibilidad(this.medicoId(), this.fecha()).subscribe({
      next: (d) => {
        this.slots.set(d.slots);
        this.loading.set(false);
      },
      error: () => {
        this.slots.set([]);
        this.loading.set(false);
      },
    });
  }

  /** Tiempo real: al cambiar un slot de este médico, refrescamos la grilla. */
  private suscribirTiempoReal(medicoId: string): void {
    this.socketSub?.unsubscribe();
    this.socketSub = this.socket
      .watchMedico(medicoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarDisponibilidad());
  }

  reservar(slot: Slot): void {
    if (!slot.disponible) return;
    this.msg.set(null);
    this.error.set(null);
    this.appointmentService
      .reservar({
        medicoId: this.medicoId(),
        fechaHora: slot.fechaHora,
        modalidad: this.modalidad(),
      })
      .subscribe({
        next: () => {
          const via = this.modalidad() === 'teleconsulta' ? ' (teleconsulta 🎥)' : '';
          this.msg.set(`Cita reservada para las ${slot.hora}${via} 🎉`);
          this.cargarDisponibilidad();
        },
        error: (err: HttpErrorResponse) => {
          // 409 = alguien tomó el slot mientras tanto
          this.error.set(err.error?.message ?? 'No se pudo reservar');
          this.cargarDisponibilidad();
        },
      });
  }

  readonly hayDisponibles = () => this.slots().some((s) => s.disponible);
}
