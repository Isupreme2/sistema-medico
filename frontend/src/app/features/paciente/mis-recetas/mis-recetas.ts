import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { PrescriptionService } from '../../../core/services/prescription.service';
import { Prescription } from '../../../core/models/prescription.model';
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

  readonly recetas = signal<Prescription[]>([]);
  readonly loading = signal(true);

  constructor() {
    const id = this.auth.user()?._id ?? '';
    this.service.listByPatient(id).subscribe({
      next: (r) => {
        this.recetas.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  readonly momentoLabel = momentoLabel;

  descargar(r: Prescription): void {
    this.service.descargarPdf(r);
  }
}
