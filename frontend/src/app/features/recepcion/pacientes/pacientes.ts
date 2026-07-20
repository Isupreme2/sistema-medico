import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { debounceTime, startWith, switchMap, catchError } from 'rxjs/operators';
import { PatientService, CreatePatientPayload } from '../../../core/services/patient.service';
import { PatientLite } from '../../../core/models/user.model';

/** Recepción: busca pacientes existentes y registra nuevos. */
@Component({
  selector: 'app-recepcion-pacientes',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="page">
      <header class="page__head">
        <h1>Pacientes</h1>
        <p class="muted">Busca pacientes registrados o da de alta a uno nuevo.</p>
      </header>

      <div class="grid">
        <!-- Buscar -->
        <div class="card">
          <h2>Buscar paciente</h2>
          <input
            type="search"
            placeholder="Nombre, apellido o email…"
            [ngModel]="q()"
            (ngModelChange)="onSearch($event)"
            class="input"
          />
          @if (loading()) {
            <p class="muted">Buscando…</p>
          } @else if (pacientes().length === 0) {
            <p class="muted">Sin resultados.</p>
          } @else {
            <ul class="list">
              @for (p of pacientes(); track p._id) {
                <li>
                  <strong>{{ p.nombre }} {{ p.apellido }}</strong>
                  <span class="muted">{{ p.email }}</span>
                  @if (p.telefono) { <span class="muted">· {{ p.telefono }}</span> }
                </li>
              }
            </ul>
          }
        </div>

        <!-- Registrar -->
        <div class="card">
          <h2>Registrar paciente</h2>
          <form (ngSubmit)="registrar()">
            <input class="input" placeholder="Nombre" [(ngModel)]="form.nombre" name="nombre" required />
            <input class="input" placeholder="Apellido" [(ngModel)]="form.apellido" name="apellido" required />
            <input class="input" type="email" placeholder="Email" [(ngModel)]="form.email" name="email" required />
            <input class="input" type="password" placeholder="Contraseña (mín. 8, mayús/minús/número)" [(ngModel)]="form.password" name="password" required />
            <input class="input" placeholder="Teléfono (opcional)" [(ngModel)]="form.telefono" name="telefono" />
            <div class="row-2">
              <select class="input" [(ngModel)]="form.tipoDocumento" name="tipoDocumento" required>
                <option value="DNI">DNI</option>
                <option value="CE">C. Extranjería</option>
                <option value="PAS">Pasaporte</option>
              </select>
              <input class="input" placeholder="N° de documento" [(ngModel)]="form.numeroDocumento" name="numeroDocumento" required />
            </div>
            <div class="row-2">
              <input class="input" type="date" [(ngModel)]="form.fechaNacimiento" name="fechaNacimiento" title="Fecha de nacimiento" />
              <select class="input" [(ngModel)]="form.sexo" name="sexo">
                <option value="">Sexo (opcional)</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </div>
            <small class="hint">La fecha de nacimiento y el sexo mejoran la evaluación de riesgo clínico.</small>
            <button class="btn" type="submit" [disabled]="saving()">
              {{ saving() ? 'Registrando…' : 'Registrar paciente' }}
            </button>
          </form>
          @if (msg()) { <p class="ok">{{ msg() }}</p> }
          @if (error()) { <p class="err">{{ error() }}</p> }
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host { display: block; }
      .page__head { margin-bottom: 1.5rem; }
      .page__head h1 { margin: 0; color: var(--slate-900); }
      .muted { color: var(--slate-500); font-size: .9rem; }
      .grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
      .card {
        background: var(--bg-surface);
        border: 1.5px solid var(--border);
        border-radius: 16px;
        padding: 1.25rem 1.5rem;
      }
      .card h2 { margin-top: 0; font-size: 1.05rem; color: var(--slate-800); }
      .input {
        width: 100%;
        padding: .6rem .75rem;
        margin: .35rem 0;
        border: 1.5px solid var(--border);
        border-radius: 8px;
        box-sizing: border-box;
        transition: border-color 0.15s ease;
      }
      .input:focus { outline: none; border-color: var(--brand); }
      .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
      @media (max-width: 480px) { .row-2 { grid-template-columns: 1fr; } }
      .hint { display: block; margin: -.25rem 0 .6rem; font-size: .76rem; color: var(--slate-500); }
      .list { list-style: none; padding: 0; margin: .5rem 0 0; }
      .list li {
        display: flex;
        flex-wrap: wrap;
        gap: .5rem;
        align-items: baseline;
        padding: .55rem 0;
        border-bottom: 1px solid var(--border);
      }
      .btn {
        margin-top: .5rem;
        width: 100%;
        padding: .65rem;
        background: var(--brand);
        color: #fff;
        border: 0;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.15s ease;
      }
      .btn:hover { background: var(--brand-dark); transform: translateY(-1px); }
      .btn:disabled { opacity: .6; cursor: default; transform: none; }
      .ok { color: var(--ok-text); font-weight: 600; }
      .err { color: var(--danger-text); font-weight: 600; }
    `,
  ],
})
export class RecepcionPacientes {
  private patients = inject(PatientService);

  readonly q = signal('');
  readonly pacientes = signal<PatientLite[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly msg = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  /** Estado del formulario: `sexo` admite '' mientras no se elige. */
  form: Omit<CreatePatientPayload, 'sexo'> & { sexo: '' | 'M' | 'F' | 'O' } = {
    nombre: '', apellido: '', email: '', password: '', telefono: '',
    tipoDocumento: 'DNI', numeroDocumento: '', fechaNacimiento: '', sexo: '',
  };

  // La búsqueda se hace con debounce (250 ms) y switchMap, que cancela la
  // petición anterior: ni una llamada por tecla ni resultados fuera de orden.
  private search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        startWith(''),
        debounceTime(250),
        switchMap((q) => this.patients.search(q).pipe(catchError(() => of([] as PatientLite[])))),
        takeUntilDestroyed(),
      )
      .subscribe((p) => {
        this.pacientes.set(p);
        this.loading.set(false);
      });
  }

  onSearch(value: string): void {
    this.q.set(value);
    this.loading.set(true);
    this.search$.next(value);
  }

  registrar(): void {
    this.msg.set(null);
    this.error.set(null);
    this.saving.set(true);
    const f = this.form;
    this.patients
      .create({
        ...f,
        telefono: f.telefono || undefined,
        fechaNacimiento: f.fechaNacimiento || undefined,
        sexo: f.sexo || undefined,
      })
      .subscribe({
      next: (p) => {
        this.msg.set(`Paciente ${p.nombre} ${p.apellido} registrado correctamente.`);
        this.form = {
          nombre: '', apellido: '', email: '', password: '', telefono: '',
          tipoDocumento: 'DNI', numeroDocumento: '', fechaNacimiento: '', sexo: '',
        };
        this.saving.set(false);
        this.search$.next(this.q());
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'No se pudo registrar al paciente');
        this.saving.set(false);
      },
    });
  }
}
