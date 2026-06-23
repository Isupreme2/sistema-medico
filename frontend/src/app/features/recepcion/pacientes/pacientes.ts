import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
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
      .page__head { margin-bottom: 1rem; }
      .muted { color: #6b7280; font-size: .9rem; }
      .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
      .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; }
      .card h2 { margin-top: 0; font-size: 1.05rem; }
      .input { width: 100%; padding: .6rem .75rem; margin: .35rem 0; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; }
      .list { list-style: none; padding: 0; margin: .5rem 0 0; }
      .list li { display: flex; flex-wrap: wrap; gap: .5rem; align-items: baseline; padding: .55rem 0; border-bottom: 1px solid #f3f4f6; }
      .btn { margin-top: .5rem; width: 100%; padding: .65rem; background: #2563eb; color: #fff; border: 0; border-radius: 8px; cursor: pointer; }
      .btn:disabled { opacity: .6; cursor: default; }
      .ok { color: #047857; } .err { color: #b91c1c; }
    `,
  ],
})
export class RecepcionPacientes {
  private patients = inject(PatientService);

  readonly q = signal('');
  readonly pacientes = signal<PatientLite[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly msg = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  form: CreatePatientPayload = { nombre: '', apellido: '', email: '', password: '', telefono: '' };

  constructor() {
    this.buscar();
  }

  onSearch(value: string): void {
    this.q.set(value);
    this.buscar();
  }

  private buscar(): void {
    this.loading.set(true);
    this.patients.search(this.q()).subscribe({
      next: (p) => {
        this.pacientes.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  registrar(): void {
    this.msg.set(null);
    this.error.set(null);
    this.saving.set(true);
    this.patients.create(this.form).subscribe({
      next: (p) => {
        this.msg.set(`Paciente ${p.nombre} ${p.apellido} registrado correctamente.`);
        this.form = { nombre: '', apellido: '', email: '', password: '', telefono: '' };
        this.saving.set(false);
        this.buscar();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'No se pudo registrar al paciente');
        this.saving.set(false);
      },
    });
  }
}
