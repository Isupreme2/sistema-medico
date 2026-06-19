import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RecordService } from '../../../core/services/record.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { SignosVitales } from '../../../core/models/record.model';

@Component({
  selector: 'app-consulta',
  imports: [ReactiveFormsModule],
  templateUrl: './consulta.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './consulta.scss',
})
export class Consulta {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recordService = inject(RecordService);
  private appointmentService = inject(AppointmentService);

  readonly pacienteId = this.route.snapshot.paramMap.get('pacienteId') ?? '';
  readonly citaId = this.route.snapshot.queryParamMap.get('citaId') ?? undefined;
  readonly pacienteNombre = this.route.snapshot.queryParamMap.get('nombre') ?? 'Paciente';

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    motivo: [''],
    diagnostico: ['', Validators.required],
    cie10: [''],
    notas: [''],
    tratamiento: [''],
    peso: [null as number | null],
    talla: [null as number | null],
    presionSistolica: [null as number | null],
    presionDiastolica: [null as number | null],
    frecuenciaCardiaca: [null as number | null],
    temperatura: [null as number | null],
    glucosa: [null as number | null],
    saturacionO2: [null as number | null],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const signosVitales: SignosVitales = {};
    (
      [
        'peso',
        'talla',
        'presionSistolica',
        'presionDiastolica',
        'frecuenciaCardiaca',
        'temperatura',
        'glucosa',
        'saturacionO2',
      ] as const
    ).forEach((k) => {
      if (v[k] !== null && v[k] !== undefined && `${v[k]}` !== '') {
        signosVitales[k] = Number(v[k]);
      }
    });

    this.recordService
      .create({
        pacienteId: this.pacienteId,
        appointmentId: this.citaId,
        motivo: v.motivo || undefined,
        diagnostico: v.diagnostico,
        cie10: v.cie10 || undefined,
        notas: v.notas || undefined,
        tratamiento: v.tratamiento || undefined,
        signosVitales: Object.keys(signosVitales).length ? signosVitales : undefined,
      })
      .subscribe({
        next: () => this.finalizar(),
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(err.error?.message ?? 'No se pudo guardar la consulta');
        },
      });
  }

  /** Tras guardar, marca la cita como atendida (si vino de una) y vuelve a la agenda. */
  private finalizar(): void {
    if (this.citaId) {
      this.appointmentService.actualizarEstado(this.citaId, 'atendida').subscribe({
        next: () => this.router.navigate(['/medico/agenda']),
        error: () => this.router.navigate(['/medico/agenda']),
      });
    } else {
      this.router.navigate(['/medico/historial', this.pacienteId]);
    }
  }
}
