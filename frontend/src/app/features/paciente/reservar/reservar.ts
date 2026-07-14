import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  computed,
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

/** Nombres cortos de día (0=domingo … 6=sábado). */
const DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
/** Orden de presentación de los días de atención (semana laboral primero). */
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

/** Fecha de hoy en formato YYYY-MM-DD según la zona horaria LOCAL (no UTC). */
function hoyLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/** Convierte una fecha YYYY-MM-DD en su día de semana local (0=domingo). */
function diaSemanaDe(fecha: string): number {
  return new Date(`${fecha}T00:00:00`).getDay();
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
  /** Especialidad elegida: filtra el desplegable de médicos. */
  readonly especialidad = signal<string>('');
  readonly medicoId = signal<string>('');
  /** Fecha mínima seleccionable: hoy (no se permiten fechas pasadas). */
  readonly minFecha = hoyLocal();
  readonly fecha = signal<string>(hoyLocal());

  /** Especialidades con al menos un médico activo (para el paso 1). */
  readonly especialidades = computed(() =>
    [...new Set(this.medicos().map((m) => m.especialidad))].sort((a, b) => a.localeCompare(b, 'es')),
  );
  /** Médicos de la especialidad elegida, ordenados por nombre (paso 2). */
  readonly medicosFiltrados = computed(() => {
    const esp = this.especialidad();
    const list = esp ? this.medicos().filter((m) => m.especialidad === esp) : this.medicos();
    return [...list].sort((a, b) =>
      `${a.usuarioId.nombre} ${a.usuarioId.apellido}`.localeCompare(
        `${b.usuarioId.nombre} ${b.usuarioId.apellido}`,
        'es',
      ),
    );
  });
  /** Perfil del médico seleccionado (para mostrar sus días de atención). */
  readonly medicoSel = computed(
    () => this.medicos().find((m) => m.usuarioId._id === this.medicoId()) ?? null,
  );
  /** Días de atención del médico seleccionado, p. ej. "Lun, Mié, Vie". */
  readonly diasAtencion = computed(() => {
    const m = this.medicoSel();
    if (!m) return '';
    const set = new Set(m.horarios.map((h) => h.diaSemana));
    return ORDEN_DIAS.filter((d) => set.has(d)).map((d) => DIA_CORTO[d]).join(', ');
  });
  /** ¿El médico atiende en la fecha elegida actualmente? */
  readonly fechaEsAtendida = computed(() => {
    const m = this.medicoSel();
    if (!m) return true;
    const d = diaSemanaDe(this.fecha());
    return m.horarios.some((h) => h.diaSemana === d);
  });
  /** Próxima fecha (>= hoy) en que el médico seleccionado atiende. */
  readonly proximaFechaDisponible = computed(() => {
    const m = this.medicoSel();
    if (!m || !m.horarios.length) return null;
    const dias = new Set(m.horarios.map((h) => h.diaSemana));
    const base = new Date(`${this.minFecha}T00:00:00`);
    for (let i = 0; i < 60; i++) {
      const d = new Date(base.getTime() + i * 86_400_000);
      if (dias.has(d.getDay())) {
        const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const label = `${DIA_CORTO[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        return { fecha, label };
      }
    }
    return null;
  });
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
          const elegido = m.find((x) => x.usuarioId._id === preseleccion) ?? m[0];
          this.especialidad.set(elegido.especialidad);
          this.onMedicoChange(elegido.usuarioId._id);
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

  /** Paso 1 del selector: al cambiar la especialidad, elige su primer médico. */
  onEspecialidadChange(esp: string): void {
    this.especialidad.set(esp);
    const primero = this.medicosFiltrados()[0];
    if (primero) this.onMedicoChange(primero.usuarioId._id);
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

  /**
   * El paciente eligió un horario de un médico alternativo: cambiamos al médico
   * y lanzamos la reserva de ese mismo slot (si falta el motivo, `reservar`
   * avisa y la grilla ya queda mostrando la disponibilidad del alternativo).
   */
  onSeleccionarAlternativo(ev: { medicoId: string; slot: Slot }): void {
    const alt = this.medicos().find((m) => m.usuarioId._id === ev.medicoId);
    if (alt) this.especialidad.set(alt.especialidad);
    this.medicoId.set(ev.medicoId);
    this.suscribirTiempoReal(ev.medicoId);
    this.cargarDisponibilidad();
    this.reservar(ev.slot);
  }
}
