import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { InvoiceService } from '../../../core/services/invoice.service';
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
  private invoices = inject(InvoiceService);
  private router = inject(Router);

  readonly citas = signal<Appointment[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly msg = signal<string | null>(null);

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

  /** Antelación mínima (h) para que el paciente cancele o reprograme. */
  readonly minHoras = 24;

  /** ¿La cita está suficientemente lejos para permitir cambios del paciente? */
  puedeModificar(c: Appointment): boolean {
    const horas = (new Date(c.fechaHora).getTime() - Date.now()) / 3_600_000;
    return c.estado === 'reservada' && horas >= this.minHoras;
  }

  /**
   * Reprograma: cancela esta cita y abre la reserva con el mismo médico para
   * elegir una nueva fecha. Pide confirmación porque la cita actual se libera.
   */
  reprogramar(c: Appointment): void {
    const ok = confirm(
      'Esto cancelará tu cita actual y te llevará a elegir una nueva fecha con el mismo médico. ¿Continuar?',
    );
    if (!ok) return;
    this.error.set(null);
    this.service.cancelar(c._id).subscribe({
      next: () => this.router.navigate(['/paciente/reservar'], { queryParams: { medico: c.medicoId._id } }),
      error: (err) => this.error.set(err.error?.message ?? 'No se pudo reprogramar'),
    });
  }

  /** El médico no se presentó (cita vencida): solicita el reembolso del pago. */
  solicitarReembolso(c: Appointment): void {
    this.error.set(null);
    this.msg.set(null);
    this.invoices.reembolsarPorCita(c._id).subscribe({
      next: (f) => this.msg.set(`Reembolso procesado para la factura ${f.numero}. 💸`),
      error: (err) => this.error.set(err.error?.message ?? 'No se pudo solicitar el reembolso'),
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
