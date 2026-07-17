import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PrescriptionService } from '../../../core/services/prescription.service';
import {
  MedicamentoInput,
  Prescription,
  SafetyResult,
} from '../../../core/models/prescription.model';
import {
  FORMAS_MEDICAMENTO,
  MOMENTOS,
  PRESETS_HORARIO,
  unidadDeForma,
} from '../../../core/models/medication-forms';

/** Devuelve la fecha/hora local actual en formato datetime-local (YYYY-MM-DDTHH:mm). */
function ahoraLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

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

  readonly formas = FORMAS_MEDICAMENTO;
  readonly momentos = MOMENTOS;
  readonly presets = PRESETS_HORARIO;

  readonly pacienteId = this.route.snapshot.paramMap.get('pacienteId') ?? '';
  readonly pacienteNombre = this.route.snapshot.queryParamMap.get('nombre') ?? 'Paciente';
  /** Si se receta desde una consulta del historial, queda vinculada a ella. */
  readonly historialId = this.route.snapshot.queryParamMap.get('historialId') ?? undefined;

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly alerta = signal<SafetyResult | null>(null);
  readonly emitida = signal<Prescription | null>(null);

  form = this.fb.nonNullable.group({
    inicio: [ahoraLocal(), Validators.required],
    indicaciones: [''],
    medicamentos: this.fb.array([this.medRow()]),
  });

  get medicamentos(): FormArray {
    return this.form.get('medicamentos') as FormArray;
  }

  private medRow() {
    return this.fb.nonNullable.group({
      forma: ['Pastilla', Validators.required],
      nombre: ['', Validators.required],
      concentracion: ['', Validators.required],
      cantidad: ['1', Validators.required],
      momento: ['indiferente'],
      segunNecesidad: [false],
      dias: [7, [Validators.min(1), Validators.max(365)]],
      horas: this.fb.array<FormControl<string>>([this.fb.nonNullable.control('08:00')]),
    });
  }

  /** FormArray de horarios de un medicamento. */
  horasDe(i: number): FormArray<FormControl<string>> {
    return this.medicamentos.at(i).get('horas') as FormArray<FormControl<string>>;
  }

  /** Marca "según necesidad" del medicamento i. */
  esPrn(i: number): boolean {
    return !!this.medicamentos.at(i).get('segunNecesidad')?.value;
  }

  /** Unidad de dosis (tableta, ml…) según la forma elegida. */
  unidadDe(i: number): string {
    return unidadDeForma(this.medicamentos.at(i).get('forma')?.value);
  }

  /** Resumen del plan de tomas (para el preview antes de emitir). */
  resumen(i: number): string {
    if (this.esPrn(i)) return 'Según necesidad · sin horario fijo';
    const tomas = this.horasDe(i).length;
    const dias = Number(this.medicamentos.at(i).get('dias')?.value) || 0;
    if (!tomas || !dias) return '';
    const total = tomas * dias;
    return `${tomas} toma(s)/día × ${dias} día(s) = ${total} recordatorio(s)`;
  }

  addMed(): void {
    this.medicamentos.push(this.medRow());
  }
  removeMed(i: number): void {
    if (this.medicamentos.length > 1) this.medicamentos.removeAt(i);
  }

  addHora(i: number): void {
    this.horasDe(i).push(this.fb.nonNullable.control('12:00'));
  }
  removeHora(i: number, j: number): void {
    const horas = this.horasDe(i);
    if (horas.length > 1) horas.removeAt(j);
  }

  /** Aplica un preset de horarios (reemplaza los actuales). */
  aplicarPreset(i: number, horas: string[]): void {
    const arr = this.horasDe(i);
    arr.clear();
    horas.forEach((h) => arr.push(this.fb.nonNullable.control(h)));
  }

  emitir(confirmar = false): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Completa los campos obligatorios de cada medicamento.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const medicamentos: MedicamentoInput[] = v.medicamentos.map((m) => ({
      forma: m.forma,
      nombre: m.nombre,
      concentracion: m.concentracion,
      cantidad: m.cantidad,
      momento: m.momento,
      segunNecesidad: m.segunNecesidad,
      horas: m.segunNecesidad ? undefined : m.horas,
      dias: m.segunNecesidad ? undefined : Number(m.dias),
    }));

    this.prescriptionService
      .emitir({
        pacienteId: this.pacienteId,
        historialId: this.historialId,
        inicio: new Date(v.inicio).toISOString(),
        medicamentos,
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
