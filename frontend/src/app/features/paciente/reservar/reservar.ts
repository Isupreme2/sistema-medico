import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MedicoService } from '../../../core/services/medico.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AppointmentTypeService } from '../../../core/services/appointment-type.service';
import { SocketService } from '../../../core/services/socket.service';
import { MedicoProfile, AppointmentType } from '../../../core/models/medico.model';
import { AppointmentModality, Slot } from '../../../core/models/appointment.model';
import { PaymentGateway } from '../../../shared/payment-gateway/payment-gateway';
import { MedicosAlternativos } from '../../../shared/medicos-alternativos/medicos-alternativos';

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
  imports: [PaymentGateway, RouterLink, MedicosAlternativos],
  templateUrl: './reservar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './reservar.scss',
})
export class Reservar {
  private medicoService = inject(MedicoService);
  private appointmentService = inject(AppointmentService);
  private appointmentTypeService = inject(AppointmentTypeService);
  private socket = inject(SocketService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  readonly medicos = signal<MedicoProfile[]>([]);
  readonly tipos = signal<AppointmentType[]>([]);
  readonly tipoCitaId = signal<string>('');
  readonly medicoId = signal<string>('');
  /** Fecha mínima seleccionable: hoy (no se permiten fechas pasadas). */
  readonly minFecha = hoyLocal();
  readonly fecha = signal<string>(hoyLocal());
  readonly modalidad = signal<AppointmentModality>('presencial');
  /** Motivo de consulta: obligatorio para confirmar la reserva. */
  readonly motivo = signal<string>('');
  readonly slots = signal<Slot[]>([]);
  readonly loading = signal(false);
  readonly msg = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  /** Id de la cita recién creada, para ofrecer completar la pre-consulta. */
  readonly citaCreadaId = signal<string | null>(null);
  /** Id de la cita que se canceló para reprogramar (viene de Mis Citas). */
  readonly reprogramandoId = signal<string | null>(null);

  // --- Pago para confirmar (la cita se crea solo si el pago tiene éxito) ---
  readonly tarifa = TARIFA_CONSULTA;
  /** Slot elegido pendiente de pago (aún no se ha creado la cita). */
  readonly slotPendiente = signal<Slot | null>(null);
  readonly pagoAbierto = signal(false);

  private socketSub?: Subscription;

  constructor() {
    this.medicoService
      .list(true)
      .pipe(takeUntilDestroyed())
      .subscribe((m) => {
        this.medicos.set(m);
        const reprogramando = this.route.snapshot.queryParamMap.get('reprogramando');
        if (reprogramando) this.reprogramandoId.set(reprogramando);
        if (m.length && !this.medicoId()) {
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
    // No se permiten fechas anteriores a hoy: se ajusta al día actual.
    if (fecha && fecha < this.minFecha) {
      this.error.set('No puedes reservar en una fecha anterior a hoy.');
      this.fecha.set(this.minFecha);
      this.cargarDisponibilidad();
      return;
    }
    this.error.set(null);
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

  /** Elegir un horario abre el pago: la cita se confirma solo si el pago entra. */
  reservar(slot: Slot): void {
    if (!slot.disponible) return;
    this.msg.set(null);
    this.error.set(null);
    if (!this.motivo().trim()) {
      this.error.set('Cuéntanos el motivo de tu consulta antes de elegir un horario.');
      return;
    }
    this.slotPendiente.set(slot);
    this.pagoAbierto.set(true);
  }

  cerrarPago(): void {
    // Cancelar el pago = no se reserva nada (el horario sigue libre).
    this.pagoAbierto.set(false);
    this.slotPendiente.set(null);
  }

  /** Pago confirmado → se crea la cita Y su factura pagada de forma atómica. */
  onPagado(metodo: string): void {
    this.pagoAbierto.set(false);
    const slot = this.slotPendiente();
    if (!slot) return;
    this.appointmentService
      .reservarYPagar({
        medicoId: this.medicoId(),
        fechaHora: slot.fechaHora,
        modalidad: this.modalidad(),
        tipoCitaId: this.tipoCitaId() || undefined,
        motivo: this.motivo().trim(),
        metodoPago: metodo,
      })
      .subscribe({
        next: (cita) => {
          const via = this.modalidad() === 'teleconsulta' ? ' (teleconsulta 🎥)' : '';
          this.msg.set(
            `Cita reservada y pagada para las ${slot.hora}${via} 🎉 Tu factura está en “Mis facturas”.`,
          );
          this.citaCreadaId.set(cita._id);
          this.motivo.set('');
          this.slotPendiente.set(null);
          this.cargarDisponibilidad();
        },
        error: (err: HttpErrorResponse) => {
          // 409 = alguien tomó el slot mientras pagabas (no se cobró nada real).
          this.error.set(err.error?.message ?? 'No se pudo reservar ese horario, elige otro.');
          this.slotPendiente.set(null);
          this.cargarDisponibilidad();
        },
      });
  }

  readonly hayDisponibles = () => this.slots().some((s) => s.disponible);

  onSeleccionarAlternativo(ev: { medicoId: string; slot: Slot }): void {
    this.onMedicoChange(ev.medicoId);
  }
}
