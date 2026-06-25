import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
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

/** Fecha de hoy en formato YYYY-MM-DD según la zona horaria LOCAL (no UTC). */
function hoyLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/** Recepción agenda una cita a nombre de un paciente. */
@Component({
  selector: 'app-recepcion-agendar',
  imports: [FormsModule],
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
            Médico
            <select class="input" [ngModel]="medicoId()" (ngModelChange)="onMedicoChange($event)">
              @for (m of medicos(); track m._id) {
                <option [value]="m.usuarioId._id">
                  Dr(a). {{ m.usuarioId.nombre }} {{ m.usuarioId.apellido }} — {{ m.especialidad }}
                </option>
              }
            </select>
          </label>
          <label>
            Fecha
            <input class="input" type="date" [ngModel]="fecha()" (ngModelChange)="onFechaChange($event)" />
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
      </div>

      <!-- Paso 3: slots -->
      <div class="card" [class.disabled]="!paciente()">
        <h2>3. Horario disponible</h2>
        @if (loading()) {
          <p class="muted">Cargando disponibilidad…</p>
        } @else if (!slots().length) {
          <p class="muted">El médico no atiende ese día o no hay horarios configurados.</p>
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
      .page__head { margin-bottom: 1rem; }
      .muted { color: #6b7280; font-size: .9rem; }
      .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
      .card.disabled { opacity: .5; pointer-events: none; }
      .card h2 { margin-top: 0; font-size: 1.05rem; }
      .input { width: 100%; padding: .6rem .75rem; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; }
      .row { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
      .row label { display: flex; flex-direction: column; gap: .3rem; font-size: .85rem; color: #374151; }
      .list { list-style: none; padding: 0; margin: .5rem 0 0; }
      .list li { display: flex; justify-content: space-between; align-items: center; gap: .5rem; padding: .5rem 0; border-bottom: 1px solid #f3f4f6; }
      .selected { display: flex; gap: .6rem; align-items: baseline; flex-wrap: wrap; }
      .btn-sm { padding: .35rem .7rem; background: #2563eb; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
      .link { background: none; border: 0; color: #2563eb; cursor: pointer; text-decoration: underline; }
      .slots { display: grid; gap: .5rem; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); }
      .slot { padding: .55rem; border: 1px solid #2563eb; color: #2563eb; background: #fff; border-radius: 8px; cursor: pointer; }
      .slot.taken { border-color: #e5e7eb; color: #9ca3af; background: #f9fafb; cursor: not-allowed; }
      .ok { color: #047857; } .err { color: #b91c1c; }
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
  readonly medicoId = signal('');
  readonly fecha = signal(hoyLocal());
  modalidadSel: AppointmentModality = 'presencial';
  tipoCitaSel = '';
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
      if (m.length) this.onMedicoChange(m[0].usuarioId._id);
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

  onFechaChange(fecha: string): void {
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
    this.appointments
      .reservar({
        medicoId: this.medicoId(),
        pacienteId: p._id,
        fechaHora: slot.fechaHora,
        modalidad: this.modalidadSel,
        tipoCitaId: this.tipoCitaSel || undefined,
      })
      .subscribe({
        next: () => {
          this.msg.set(`Cita reservada para ${p.nombre} ${p.apellido} a las ${slot.hora} 🎉`);
          this.cargarDisponibilidad();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(err.error?.message ?? 'No se pudo reservar la cita');
          this.cargarDisponibilidad();
        },
      });
  }
}
