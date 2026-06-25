import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MedicoService } from '../../../core/services/medico.service';
import { MedicoProfile } from '../../../core/models/medico.model';

@Component({
  selector: 'app-admin-medicos',
  imports: [ReactiveFormsModule],
  templateUrl: './medicos.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './medicos.scss',
})
export class AdminMedicos {
  private fb = inject(FormBuilder);
  private medicoService = inject(MedicoService);

  readonly medicos = signal<MedicoProfile[]>([]);
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
