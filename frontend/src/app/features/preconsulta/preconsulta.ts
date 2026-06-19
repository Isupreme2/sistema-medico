import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppointmentService } from '../../core/services/appointment.service';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { PreConsulta } from '../../core/models/appointment.model';

/**
 * Formulario de pre-consulta. El paciente lo completa antes de la cita; el
 * médico (o admin) lo ve en solo lectura. El backend valida quién puede editar.
 */
@Component({
  selector: 'app-preconsulta',
  imports: [ReactiveFormsModule],
  templateUrl: './preconsulta.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './preconsulta.scss',
})
export class PreConsultaForm implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private service = inject(AppointmentService);
  private auth = inject(AuthService);

  readonly esPaciente = this.auth.role() === UserRole.PACIENTE;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly msg = signal<string | null>(null);
  readonly enviado = signal<PreConsulta | null>(null);

  private appointmentId = '';

  readonly form = this.fb.group({
    motivoConsulta: ['', [Validators.required, Validators.maxLength(1000)]],
    sintomas: [''],
    inicioSintomas: [''],
    nivelDolor: [null as number | null],
    medicacionActual: [''],
    antecedentes: [''],
  });

  ngOnInit(): void {
    this.appointmentId = this.route.snapshot.paramMap.get('appointmentId') ?? '';
    this.service.getPreConsulta(this.appointmentId).subscribe({
      next: (pc) => {
        if (pc) {
          this.enviado.set(pc);
          this.form.patchValue(pc);
        }
        if (!this.esPaciente) this.form.disable();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  guardar(): void {
    if (this.form.invalid || !this.esPaciente) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.msg.set(null);
    const v = this.form.getRawValue();
    this.service
      .submitPreConsulta(this.appointmentId, {
        motivoConsulta: v.motivoConsulta!,
        sintomas: v.sintomas || undefined,
        inicioSintomas: v.inicioSintomas || undefined,
        nivelDolor: v.nivelDolor ?? undefined,
        medicacionActual: v.medicacionActual || undefined,
        antecedentes: v.antecedentes || undefined,
      })
      .subscribe({
        next: (pc) => {
          this.enviado.set(pc);
          this.msg.set('Formulario guardado. ¡Gracias! 🙌');
          this.saving.set(false);
        },
        error: (err) => {
          this.msg.set(err.error?.message ?? 'No se pudo guardar.');
          this.saving.set(false);
        },
      });
  }
}
