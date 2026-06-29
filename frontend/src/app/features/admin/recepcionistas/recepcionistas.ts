import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { StaffService, Recepcionista } from '../../../core/services/staff.service';

/** Admin: crea y lista cuentas de Recepción (Registrador). */
@Component({
  selector: 'app-admin-recepcionistas',
  imports: [ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="page-head">
      <div>
        <h1>Cuentas de Recepción</h1>
        <p class="lead">Crea y administra al personal de recepción (Registradores).</p>
      </div>
      <button class="btn-primary" (click)="toggleForm()">
        {{ showForm() ? 'Cancelar' : '+ Nueva cuenta' }}
      </button>
    </div>

    @if (ok()) {
      <div class="alert ok">{{ ok() }}</div>
    }

    @if (showForm()) {
      <form class="card form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="grid">
          <label class="field">
            <span>Nombre</span>
            <input formControlName="nombre" />
          </label>
          <label class="field">
            <span>Apellido</span>
            <input formControlName="apellido" />
          </label>
          <label class="field">
            <span>Email</span>
            <input type="email" formControlName="email" />
          </label>
          <label class="field">
            <span>Teléfono (opcional)</span>
            <input formControlName="telefono" />
          </label>
          <label class="field">
            <span>Contraseña inicial</span>
            <input type="text" formControlName="password" placeholder="Mín 8, may/min/número" />
          </label>
        </div>
        @if (error()) {
          <div class="alert err">{{ error() }}</div>
        }
        <div class="form-actions">
          <button type="submit" class="btn-primary" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : 'Crear cuenta' }}
          </button>
        </div>
      </form>
    }

    @if (loading()) {
      <p class="muted">Cargando…</p>
    } @else if (lista().length === 0) {
      <div class="card empty">Aún no hay cuentas de recepción.</div>
    } @else {
      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Creada</th>
            </tr>
          </thead>
          <tbody>
            @for (r of lista(); track r._id) {
              <tr>
                <td><strong>{{ r.nombre }} {{ r.apellido }}</strong></td>
                <td>{{ r.email }}</td>
                <td>{{ r.telefono || '—' }}</td>
                <td>
                  <span class="badge" [class.badge-off]="!r.activo">
                    {{ r.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>{{ r.creadoEn | date: 'dd/MM/yyyy' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
      .page-head h1 { margin: 0; color: var(--slate-900); }
      .lead { margin: 0.3rem 0 0; color: var(--slate-500); }
      .card { background: #fff; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 1.25rem; margin-bottom: 1rem; }
      .form .grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
      .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; color: var(--slate-700); }
      .field input { padding: 0.6rem 0.75rem; border: 1px solid var(--slate-200); border-radius: 8px; font: inherit; }
      .field input:focus { outline: none; border-color: var(--brand); }
      .form-actions { margin-top: 1rem; }
      .btn-primary { border: none; background: var(--brand); color: #fff; font-weight: 700; padding: 0.6rem 1.1rem; border-radius: 0.65rem; cursor: pointer; }
      .btn-primary:hover:not(:disabled) { background: var(--brand-dark); }
      .btn-primary:disabled { opacity: 0.6; cursor: default; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 0.6rem 0.7rem; border-bottom: 1px solid var(--slate-100); font-size: 0.9rem; }
      th { background: var(--slate-50); color: var(--slate-600); }
      .table-wrap { padding: 0; overflow: hidden; }
      .muted { color: var(--slate-500); }
      .empty { color: var(--slate-500); text-align: center; }
      .badge { padding: 0.12rem 0.55rem; border-radius: 999px; font-size: 0.76rem; background: #dcfce7; color: #166534; }
      .badge-off { background: #fee2e2; color: #991b1b; }
      .alert { padding: 0.6rem 0.85rem; border-radius: 8px; font-size: 0.88rem; margin-bottom: 1rem; }
      .alert.ok { background: #dcfce7; color: #166534; }
      .alert.err { background: #fef2f2; color: #b91c1c; }
    `,
  ],
})
export class AdminRecepcionistas {
  private fb = inject(FormBuilder);
  private staff = inject(StaffService);

  readonly lista = signal<Recepcionista[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly ok = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
      ],
    ],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.staff.list().subscribe({
      next: (r) => {
        this.lista.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    this.error.set(null);
    this.ok.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.ok.set(null);
    this.staff.create(this.form.getRawValue()).subscribe({
      next: (r) => {
        this.saving.set(false);
        this.ok.set(`Cuenta de recepción creada para ${r.nombre} ${r.apellido}.`);
        this.form.reset();
        this.showForm.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(err.error?.message ?? 'No se pudo crear la cuenta');
      },
    });
  }
}
