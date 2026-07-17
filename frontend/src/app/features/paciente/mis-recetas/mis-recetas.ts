import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { PrescriptionService } from '../../../core/services/prescription.service';
import { TomaService } from '../../../core/services/toma.service';
import { Prescription } from '../../../core/models/prescription.model';
import { Toma } from '../../../core/models/toma.model';
import { momentoLabel } from '../../../core/models/medication-forms';

@Component({
  selector: 'app-mis-recetas',
  imports: [DatePipe],
  templateUrl: './mis-recetas.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './mis-recetas.scss',
})
export class MisRecetas {
  private auth = inject(AuthService);
  private service = inject(PrescriptionService);
  private tomaService = inject(TomaService);

  readonly recetas = signal<Prescription[]>([]);
  readonly loading = signal(true);

  readonly tomas = signal<Toma[]>([]);
  /** Solo las que aún no confirmó ni se omitieron (lo que le queda por tomar). */
  readonly proximasTomas = computed(() =>
    this.tomas().filter((t) => t.estado === 'pendiente' || t.estado === 'enviada'),
  );

  constructor() {
    const id = this.auth.user()?._id ?? '';
    this.service.listByPatient(id).subscribe({
      next: (r) => {
        this.recetas.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.cargarTomas();
  }

  private cargarTomas(): void {
    this.tomaService.proximas().subscribe({
      next: (t) => this.tomas.set(t),
      error: () => this.tomas.set([]),
    });
  }

  readonly momentoLabel = momentoLabel;

  confirmarToma(t: Toma): void {
    this.tomaService.confirmar(t._id).subscribe({
      next: (upd) =>
        this.tomas.update((list) => list.map((x) => (x._id === upd._id ? upd : x))),
    });
  }

  descargar(r: Prescription): void {
    this.service.descargarPdf(r);
  }
}
