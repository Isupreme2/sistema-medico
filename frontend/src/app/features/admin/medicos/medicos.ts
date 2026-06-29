import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MedicoService } from '../../../core/services/medico.service';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { MedicoProfile } from '../../../core/models/medico.model';

@Component({
  selector: 'app-admin-medicos',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './medicos.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './medicos.scss',
})
export class AdminMedicos {
  private fb = inject(FormBuilder);
  private medicoService = inject(MedicoService);
  private specialtyService = inject(SpecialtyService);

  readonly medicos = signal<MedicoProfile[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly ok = signal<string | null>(null);

  // --- Selector de especialidad con buscador ---
  readonly especialidades = signal<string[]>([]);
  readonly espQuery = signal('');
  readonly espOpen = signal(false);
  /** Filtra el catálogo por coincidencia mientras se escribe. */
  readonly espFiltradas = computed(() => {
    const q = this.espQuery().toLowerCase().trim();
    const todas = this.especialidades();
    if (!q) return todas;
    return todas.filter((e) => e.toLowerCase().includes(q));
  });

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    especialidad: ['', Validators.required],
    numeroColegiatura: ['', Validators.required],
    duracionSlotMin: [30, [Validators.required, Validators.min(5), Validators.max(240)]],
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
    this.specialtyService.list().subscribe((e) => this.especialidades.set(e));
  }

  /** Escribe en el buscador: filtra y mantiene el valor del formulario sincronizado. */
  onEspInput(value: string): void {
    this.espQuery.set(value);
    this.form.controls.especialidad.setValue(value);
    this.espOpen.set(true);
  }

  /** Elige una especialidad del listado filtrado. */
  elegirEsp(nombre: string): void {
    this.espQuery.set(nombre);
    this.form.controls.especialidad.setValue(nombre);
    this.espOpen.set(false);
  }

  cerrarEsp(): void {
    // Pequeño retraso para permitir el click sobre una opción antes de cerrar.
    setTimeout(() => this.espOpen.set(false), 150);
  }

  load(): void {
    this.loading.set(true);
    this.medicoService.list().subscribe({
      next: (m) => {
        this.medicos.set(m);
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

  /** Activa o desactiva un médico (afecta su visibilidad al reservar). */
  toggleActivo(m: MedicoProfile): void {
    this.medicoService.setActivo(m.usuarioId._id, !m.activo).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) =>
        this.error.set(err.error?.message ?? 'No se pudo actualizar el estado'),
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.ok.set(null);

    this.medicoService.create(this.form.getRawValue()).subscribe({
      next: (m) => {
        this.saving.set(false);
        this.ok.set(`Médico ${m.usuarioId.nombre} ${m.usuarioId.apellido} creado`);
        this.form.reset({ duracionSlotMin: 30 });
        this.espQuery.set('');
        this.showForm.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(err.error?.message ?? 'No se pudo crear el médico');
      },
    });
  }
}
