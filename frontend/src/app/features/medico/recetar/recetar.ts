import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PrescriptionService } from '../../../core/services/prescription.service';
import { Prescription, SafetyResult } from '../../../core/models/prescription.model';

@Component({
  selector: 'app-recetar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recetar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './recetar.scss',
})
export class Recetar {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private prescriptionService = inject(PrescriptionService);

  readonly pacienteId = this.route.snapshot.paramMap.get('pacienteId') ?? '';
  readonly pacienteNombre = this.route.snapshot.queryParamMap.get('nombre') ?? 'Paciente';

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly alerta = signal<SafetyResult | null>(null);
  readonly emitida = signal<Prescription | null>(null);

  form = this.fb.nonNullable.group({
    indicaciones: [''],
    medicamentos: this.fb.array([this.medRow()]),
  });

  get medicamentos(): FormArray {
    return this.form.get('medicamentos') as FormArray;
  }

  private medRow() {
    return this.fb.nonNullable.group({
      nombre: ['', Validators.required],
      dosis: ['', Validators.required],
      frecuencia: ['', Validators.required],
      duracion: ['', Validators.required],
    });
  }

  addMed(): void {
    this.medicamentos.push(this.medRow());
  }
  removeMed(i: number): void {
    if (this.medicamentos.length > 1) this.medicamentos.removeAt(i);
  }

  emitir(confirmar = false): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    this.prescriptionService
      .emitir({
        pacienteId: this.pacienteId,
        medicamentos: v.medicamentos,
        indicaciones: v.indicaciones || undefined,
        confirmar,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.alerta.set(null);
          this.emitida.set(res.receta);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          // 422 con alertas de seguridad → mostrar y permitir confirmar
          const details = err.error?.details;
          if (err.status === 422 && details?.requiereConfirmacion) {
            this.alerta.set({ alergias: details.alergias, interacciones: details.interacciones });
          } else {
            this.error.set(err.error?.message ?? 'No se pudo emitir la receta');
          }
        },
      });
  }

  descargar(): void {
    const r = this.emitida();
    if (r) this.prescriptionService.descargarPdf(r);
  }
}
