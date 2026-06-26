import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MedicoService } from '../../../core/services/medico.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AppointmentTypeService } from '../../../core/services/appointment-type.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { SocketService } from '../../../core/services/socket.service';
import { MedicoProfile, AppointmentType } from '../../../core/models/medico.model';
import { AppointmentModality, Slot } from '../../../core/models/appointment.model';
import { PaymentGateway } from '../../../shared/payment-gateway/payment-gateway';

/** Tarifa de consulta para la demo de pago (S/). */
const TARIFA_CONSULTA = 80;

/** Fecha de hoy en formato YYYY-MM-DD según la zona horaria LOCAL (no UTC). */
function hoyLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-reservar',
  imports: [PaymentGateway],
  templateUrl: './reservar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './reservar.scss',
})
export class Reservar {
  private medicoService = inject(MedicoService);
  private appointmentService = inject(AppointmentService);
  private appointmentTypeService = inject(AppointmentTypeService);
  private invoiceService = inject(InvoiceService);
  private socket = inject(SocketService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  readonly medicos = signal<MedicoProfile[]>([]);
  readonly tipos = signal<AppointmentType[]>([]);
  readonly tipoCitaId = signal<string>('');
  readonly medicoId = signal<string>('');
  readonly fecha = signal<string>(hoyLocal());
  readonly modalidad = signal<AppointmentModality>('presencial');
  readonly slots = signal<Slot[]>([]);
  readonly loading = signal(false);
  readonly msg = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  // --- Pago (demo de pasarela) ---
  readonly tarifa = TARIFA_CONSULTA;
  /** Última cita reservada pendiente de pago. */
  readonly reservada = signal<{ hora: string; citaId: string } | null>(null);
  readonly pagoAbierto = signal(false);
  readonly pagado = signal(false);

  private socketSub?: Subscription;

  constructor() {
    this.medicoService
      .list(true)
      .pipe(takeUntilDestroyed())
      .subscribe((m) => {
        this.medicos.set(m);
        if (m.length && !this.medicoId()) {
          // Si venimos de "Reprogramar", preseleccionamos ese médico.
          const preseleccion = this.route.snapshot.queryParamMap.get('medico');
          const existe = preseleccion && m.some((x) => x.usuarioId._id === preseleccion);
          this.onMedicoChange(existe ? preseleccion! : m[0].usuarioId._id);
        }
      });

    this.appointmentTypeService
      .list(true)
      .pipe(takeUntilDestroyed())
      .subscribe((t) => this.tipos.set(t));
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
        tipoCitaId: this.tipoCitaId() || undefined,
      })
      .subscribe({
        next: (cita) => {
          const via = this.modalidad() === 'teleconsulta' ? ' (teleconsulta 🎥)' : '';
          this.msg.set(`Cita reservada para las ${slot.hora}${via} 🎉`);
          this.reservada.set({ hora: slot.hora, citaId: cita._id });
          this.pagado.set(false);
          this.cargarDisponibilidad();
        },
        error: (err: HttpErrorResponse) => {
          // 409 = alguien tomó el slot mientras tanto
          this.error.set(err.error?.message ?? 'No se pudo reservar');
          this.cargarDisponibilidad();
        },
      });
  }

  abrirPago(): void {
    this.pagoAbierto.set(true);
  }

  cerrarPago(): void {
    this.pagoAbierto.set(false);
  }

  onPagado(metodo: string): void {
    this.pagoAbierto.set(false);
    const r = this.reservada();
    if (!r) return;
    // El cobro simulado se confirmó → registramos la factura pagada en el sistema.
    this.invoiceService.pagarCita(r.citaId, metodo).subscribe({
      next: () => {
        this.pagado.set(true);
        this.msg.set('Pago registrado. Tu factura está en “Mis facturas”. 🧾');
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'El pago no se pudo registrar.');
      },
    });
  }

  readonly hayDisponibles = () => this.slots().some((s) => s.disponible);
}
