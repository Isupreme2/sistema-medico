import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AppointmentTypeService } from '../../../core/services/appointment-type.service';
import { AppointmentType } from '../../../core/models/medico.model';

@Component({
  selector: 'app-admin-tipos-cita',
  imports: [ReactiveFormsModule],
  templateUrl: './tipos-cita.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../medicos/medicos.scss'],
})
export class AdminTiposCita {
  private fb = inject(FormBuilder);
  private service = inject(AppointmentTypeService);

  readonly tipos = signal<AppointmentType[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    duracionMin: [30, [Validators.required, Validators.min(5), Validators.max(240)]],
    color: ['#2563eb'],
    descripcion: [''],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (t) => {
        this.tipos.set(t);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    this.error.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.service.create(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset({ duracionMin: 30, color: '#2563eb' });
        this.showForm.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(err.error?.message ?? 'No se pudo crear el tipo de cita');
      },
    });
  }

  toggleActivo(t: AppointmentType): void {
    this.service.update(t._id, { activo: !t.activo }).subscribe({ next: () => this.load() });
  }

  remove(t: AppointmentType): void {
    this.service.remove(t._id).subscribe({ next: () => this.load() });
  }
}
