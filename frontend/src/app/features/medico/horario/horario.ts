import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { MedicoService } from '../../../core/services/medico.service';
import { Bloqueo, DIAS_SEMANA, Horario } from '../../../core/models/medico.model';

@Component({
  selector: 'app-medico-horario',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './horario.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './horario.scss',
})
export class MedicoHorario {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private medicoService = inject(MedicoService);

  readonly dias = DIAS_SEMANA;
  private myId = this.auth.user()?._id ?? '';

  readonly loading = signal(true);
  readonly horarios = signal<Horario[]>([]);
  readonly duracionSlotMin = signal(30);
  readonly bloqueos = signal<Bloqueo[]>([]);
  readonly savingHorario = signal(false);
  readonly msg = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  /** Nombre legible de un día. */
  readonly diaNombre = (d: number) =>
    this.dias.find((x) => x.valor === d)?.nombre ?? '';

  /** Horarios ordenados por día y hora para mostrar. */
  readonly horariosOrdenados = computed(() =>
    [...this.horarios()].sort(
      (a, b) =>
        (a.diaSemana === 0 ? 7 : a.diaSemana) - (b.diaSemana === 0 ? 7 : b.diaSemana) ||
        a.horaInicio.localeCompare(b.horaInicio),
    ),
  );

  franjaForm = this.fb.nonNullable.group({
    diaSemana: [1, Validators.required],
    horaInicio: ['09:00', Validators.required],
    horaFin: ['13:00', Validators.required],
  });

  bloqueoForm = this.fb.nonNullable.group({
    desde: ['', Validators.required],
    hasta: ['', Validators.required],
    motivo: [''],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.medicoService.get(this.myId).subscribe({
      next: (m) => {
        this.horarios.set(m.horarios);
        this.duracionSlotMin.set(m.duracionSlotMin);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.medicoService.listBloqueos(this.myId).subscribe({
      next: (b) => this.bloqueos.set(b),
    });
  }

  addFranja(): void {
    if (this.franjaForm.invalid) return;
    const { diaSemana, horaInicio, horaFin } = this.franjaForm.getRawValue();
    if (horaInicio >= horaFin) {
      this.error.set('La hora de inicio debe ser anterior a la de fin');
      return;
    }
    this.error.set(null);
    this.horarios.update((list) => [...list, { diaSemana, horaInicio, horaFin }]);
  }

  removeFranja(index: number): void {
    this.horarios.update((list) => list.filter((_, i) => i !== index));
  }

  guardarHorario(): void {
    this.savingHorario.set(true);
    this.msg.set(null);
    this.error.set(null);
    this.medicoService
      .updateHorario(this.myId, this.horarios(), this.duracionSlotMin())
      .subscribe({
        next: () => {
          this.savingHorario.set(false);
          this.msg.set('Horario guardado correctamente');
        },
        error: (err: HttpErrorResponse) => {
          this.savingHorario.set(false);
          this.error.set(err.error?.message ?? 'No se pudo guardar el horario');
        },
      });
  }

  addBloqueo(): void {
    if (this.bloqueoForm.invalid) {
      this.bloqueoForm.markAllAsTouched();
      return;
    }
    const { desde, hasta, motivo } = this.bloqueoForm.getRawValue();
    this.medicoService.createBloqueo(this.myId, desde, hasta, motivo || undefined).subscribe({
      next: () => {
        this.bloqueoForm.reset();
        this.medicoService
          .listBloqueos(this.myId)
          .subscribe({ next: (b) => this.bloqueos.set(b) });
      },
      error: (err: HttpErrorResponse) =>
        this.error.set(err.error?.message ?? 'No se pudo crear el bloqueo'),
    });
  }

  removeBloqueo(id: string): void {
    this.medicoService.deleteBloqueo(this.myId, id).subscribe({
      next: () => this.bloqueos.update((list) => list.filter((b) => b._id !== id)),
    });
  }
}
