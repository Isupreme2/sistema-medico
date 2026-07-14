import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';
import { MedicoService } from '../../../core/services/medico.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AppointmentTypeService } from '../../../core/services/appointment-type.service';
import { PatientService } from '../../../core/services/patient.service';
import { MedicoProfile, AppointmentType } from '../../../core/models/medico.model';
import { AppointmentModality, Slot } from '../../../core/models/appointment.model';
import { PatientLite } from '../../../core/models/user.model';
import { MedicosAlternativos } from '../../../shared/medicos-alternativos/medicos-alternativos';

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

/** Recepción agenda una cita a nombre de un paciente. */
@Component({
  selector: 'app-recepcion-agendar',
  imports: [FormsModule, MedicosAlternativos],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="page">
      <header class="page__head">
        <h1>Agendar cita</h1>
        <p class="muted">Reserva una cita a nombre de un paciente.</p>
      </header>

      <!-- Paso 1: paciente -->
      <div class="card">
        <h2>1. Paciente</h2>
        @if (paciente()) {
          <p class="selected">
            <strong>{{ paciente()!.nombre }} {{ paciente()!.apellido }}</strong>
            <span class="muted">{{ paciente()!.email }}</span>
            <button class="link" (click)="limpiarPaciente()">cambiar</button>
          </p>
        } @else {
          <input
            type="search"
            class="input"
            placeholder="Buscar paciente por nombre o email…"
            [ngModel]="q()"
            (ngModelChange)="onSearch($event)"
          />
          @if (pacientes().length) {
            <ul class="list">
              @for (p of pacientes(); track p._id) {
                <li>
                  <span>{{ p.nombre }} {{ p.apellido }} <span class="muted">{{ p.email }}</span></span>
                  <button class="btn-sm" (click)="seleccionar(p)">Elegir</button>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">Escribe para buscar. ¿No existe? Regístralo en “Pacientes”.</p>
          }
        }
      </div>

      <!-- Paso 2: médico, fecha, modalidad -->
      <div class="card" [class.disabled]="!paciente()">
        <h2>2. Médico y fecha</h2>
        <div class="row">
          <label>
            Especialidad
            <select class="input" [ngModel]="especialidad()" (ngModelChange)="onEspecialidadChange($event)">
              @for (esp of especialidades(); track esp) {
                <option [value]="esp">{{ esp }}</option>
              }
            </select>
          </label>
          <label>
            Médico
            <select class="input" [ngModel]="medicoId()" (ngModelChange)="onMedicoChange($event)">
              @for (m of medicosFiltrados(); track m._id) {
                <option [value]="m.usuarioId._id">
                  Dr(a). {{ m.usuarioId.nombre }} {{ m.usuarioId.apellido }}
                </option>
              }
            </select>
          </label>
          <label>
            Fecha
            <input class="input" type="date" [min]="minFecha" [ngModel]="fecha()" (ngModelChange)="onFechaChange($event)" />
            @if (diasAtencion()) {
              <small class="dias-hint">Atiende: {{ diasAtencion() }}</small>
            }
            @if (!fechaEsAtendida() && proximaFechaDisponible(); as prox) {
              <button type="button" class="prox-btn" (click)="onFechaChange(prox.fecha)">
                Próxima disponible: {{ prox.label }}
              </button>
            }
          </label>
          <label>
            Modalidad
            <select class="input" [(ngModel)]="modalidadSel">
              <option value="presencial">Presencial</option>
              <option value="teleconsulta">Teleconsulta 🎥</option>
            </select>
          </label>
          @if (tipos().length) {
            <label>
              Tipo de consulta
              <select class="input" [(ngModel)]="tipoCitaSel">
                <option value="">General (duración estándar)</option>
                @for (t of tipos(); track t._id) {
                  <option [value]="t._id">{{ t.nombre }} · {{ t.duracionMin }} min</option>
                }
              </select>
            </label>
          }
        </div>
        <label class="motivo-field">
          Motivo de consulta *
          <input
            class="input"
            type="text"
            maxlength="500"
            placeholder="Ej. Control de presión arterial"
            [(ngModel)]="motivoSel"
          />
        </label>
      </div>

      <!-- Paso 3: slots -->
      <div class="card" [class.disabled]="!paciente()">
        <h2>3. Horario disponible</h2>
        @if (loading()) {
          <p class="muted">Cargando disponibilidad…</p>
        } @else if (!slots().length) {
          <p class="muted">El médico no atiende ese día o no hay horarios configurados.</p>
          @if (medicoId()) {
            <app-medicos-alternativos
              [medicoId]="medicoId()"
              [fecha]="fecha()"
              (seleccionar)="onSeleccionarAlternativo($event)"
            />
          }
        } @else {
          <div class="slots">
            @for (s of slots(); track s.fechaHora) {
              <button
                class="slot"
                [class.taken]="!s.disponible"
                [disabled]="!s.disponible || !paciente()"
                (click)="reservar(s)"
              >
                {{ s.hora }}
              </button>
            }
          </div>
        }
        @if (msg()) { <p class="ok">{{ msg() }}</p> }
        @if (error()) { <p class="err">{{ error() }}</p> }
      </div>
    </section>
  `,
  styles: [
    `
      :host { display: block; }
      .page__head { margin-bottom: 1.5rem; }
      .page__head h1 { margin: 0; color: var(--slate-900); }
      .muted { color: var(--slate-500); font-size: .9rem; }
      .card {
        background: var(--bg-surface);
        border: 1.5px solid var(--border);
        border-radius: 16px;
        padding: 1.25rem 1.5rem;
        margin-bottom: 1rem;
      }
      .card.disabled { opacity: .5; pointer-events: none; }
      .card h2 { margin-top: 0; font-size: 1.05rem; color: var(--slate-800); }
      .input {
        width: 100%;
        padding: .6rem .75rem;
        border: 1.5px solid var(--border);
        border-radius: 8px;
        box-sizing: border-box;
        transition: border-color 0.15s ease;
      }
      .input:focus { outline: none; border-color: var(--brand); }
      .row { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
      .row label { display: flex; flex-direction: column; gap: .3rem; font-size: .85rem; color: var(--slate-700); }
      .dias-hint { font-size: .78rem; color: var(--slate-500); }
      .prox-btn {
        align-self: flex-start;
        background: var(--info-bg);
        color: var(--info-text);
        border: 1px solid var(--info-border);
        border-radius: 8px;
        padding: .3rem .6rem;
        font-size: .78rem;
        font-weight: 600;
        cursor: pointer;
        transition: filter 0.15s ease;
      }
      .prox-btn:hover { filter: brightness(1.05); }
      .motivo-field { display: flex; flex-direction: column; gap: .3rem; font-size: .85rem; color: var(--slate-700); margin-top: .75rem; }
      .list { list-style: none; padding: 0; margin: .5rem 0 0; }
      .list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: .5rem;
        padding: .5rem 0;
        border-bottom: 1px solid var(--border);
      }
      .selected { display: flex; gap: .6rem; align-items: baseline; flex-wrap: wrap; }
      .btn-sm {
        padding: .35rem .7rem;
        background: var(--brand);
        color: #fff;
        border: 0;
        border-radius: 8px;
        cursor: pointer;
        font-size: .82rem;
        font-weight: 600;
        transition: all 0.15s ease;
      }
      .btn-sm:hover { background: var(--brand-dark); transform: translateY(-1px); }
      .link { background: none; border: 0; color: var(--brand); cursor: pointer; text-decoration: underline; }
      .slots { display: grid; gap: .5rem; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); }
      .slot {
        padding: .55rem;
        border: 1.5px solid var(--border);
        color: var(--brand);
        background: var(--bg-surface);
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.15s ease;
      }
      .slot:hover:not(.taken) { background: var(--info-bg); transform: translateY(-1px); }
      .slot.taken { border-color: var(--border); color: var(--slate-400); background: var(--slate-100); cursor: not-allowed; }
      .ok { color: var(--ok-text); font-weight: 600; }
      .err { color: var(--danger-text); font-weight: 600; }
    `,
  ],
})
export class RecepcionAgendar {
  private medicoService = inject(MedicoService);
  private appointments = inject(AppointmentService);
  private appointmentTypes = inject(AppointmentTypeService);
  private patients = inject(PatientService);

  readonly medicos = signal<MedicoProfile[]>([]);
  readonly tipos = signal<AppointmentType[]>([]);
  /** Especialidad elegida: filtra el desplegable de médicos. */
  readonly especialidad = signal('');
  readonly medicoId = signal('');
  readonly fecha = signal(hoyLocal());
  /** Fecha mínima seleccionable: hoy (no se permiten fechas pasadas). */
  readonly minFecha = hoyLocal();

  /** Especialidades con al menos un médico activo (paso previo al médico). */
  readonly especialidades = computed(() =>
    [...new Set(this.medicos().map((m) => m.especialidad))].sort((a, b) => a.localeCompare(b, 'es')),
  );
  /** Médicos de la especialidad elegida, ordenados por nombre. */
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
  modalidadSel: AppointmentModality = 'presencial';
  tipoCitaSel = '';
  motivoSel = '';
  readonly slots = signal<Slot[]>([]);
  readonly loading = signal(false);

  readonly q = signal('');
  readonly pacientes = signal<PatientLite[]>([]);
  readonly paciente = signal<PatientLite | null>(null);

  readonly msg = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  // Búsqueda con debounce + switchMap (cancela la petición anterior).
  private search$ = new Subject<string>();

  constructor() {
    this.medicoService.list(true).subscribe((m) => {
      this.medicos.set(m);
      if (m.length) {
        this.especialidad.set(m[0].especialidad);
        this.onMedicoChange(m[0].usuarioId._id);
      }
    });

    this.appointmentTypes.list(true).subscribe((t) => this.tipos.set(t));

    this.search$
      .pipe(
        debounceTime(250),
        switchMap((q) => this.patients.search(q).pipe(catchError(() => of([] as PatientLite[])))),
        takeUntilDestroyed(),
      )
      .subscribe((p) => this.pacientes.set(p));
  }

  onSearch(value: string): void {
    this.q.set(value);
    if (!value.trim()) {
      this.pacientes.set([]);
      return;
    }
    this.search$.next(value);
  }

  seleccionar(p: PatientLite): void {
    this.paciente.set(p);
    this.pacientes.set([]);
    this.q.set('');
  }

  limpiarPaciente(): void {
    this.paciente.set(null);
    this.msg.set(null);
  }

  onMedicoChange(id: string): void {
    this.medicoId.set(id);
    this.cargarDisponibilidad();
  }

  /** Paso previo: al cambiar la especialidad, elige su primer médico. */
  onEspecialidadChange(esp: string): void {
    this.especialidad.set(esp);
    const primero = this.medicosFiltrados()[0];
    if (primero) this.onMedicoChange(primero.usuarioId._id);
  }

  onFechaChange(fecha: string): void {
    // No se permiten fechas anteriores a hoy: se ajusta al día actual.
    if (fecha && fecha < this.minFecha) {
      this.fecha.set(this.minFecha);
      this.cargarDisponibilidad();
      return;
    }
    this.fecha.set(fecha);
    this.cargarDisponibilidad();
  }

  private cargarDisponibilidad(): void {
    if (!this.medicoId() || !this.fecha()) return;
    this.loading.set(true);
    this.appointments.disponibilidad(this.medicoId(), this.fecha()).subscribe({
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

  reservar(slot: Slot): void {
    const p = this.paciente();
    if (!slot.disponible || !p) return;
    this.msg.set(null);
    this.error.set(null);
    if (!this.motivoSel.trim()) {
      this.error.set('Indica el motivo de la consulta antes de reservar.');
      return;
    }
    this.appointments
      .reservar({
        medicoId: this.medicoId(),
        pacienteId: p._id,
        fechaHora: slot.fechaHora,
        modalidad: this.modalidadSel,
        tipoCitaId: this.tipoCitaSel || undefined,
        motivo: this.motivoSel.trim(),
      })
      .subscribe({
        next: () => {
          this.msg.set(`Cita reservada para ${p.nombre} ${p.apellido} a las ${slot.hora} 🎉`);
          this.motivoSel = '';
          this.cargarDisponibilidad();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(err.error?.message ?? 'No se pudo reservar la cita');
          this.cargarDisponibilidad();
        },
        });
  }

  /**
   * Recepción eligió un horario de un médico alternativo: cambiamos al médico y
   * reservamos ese slot directamente (reservar valida paciente y motivo).
   */
  onSeleccionarAlternativo(ev: { medicoId: string; slot: Slot }): void {
    const alt = this.medicos().find((m) => m.usuarioId._id === ev.medicoId);
    if (alt) this.especialidad.set(alt.especialidad);
    this.medicoId.set(ev.medicoId);
    this.cargarDisponibilidad();
    this.reservar(ev.slot);
  }
}
