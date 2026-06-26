import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InvoiceService } from '../../../core/services/invoice.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';
import { Invoice } from '../../../core/models/invoice.model';

@Component({
  selector: 'app-facturas',
  imports: [DatePipe, RouterLink],
  templateUrl: './facturas.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './facturas.scss',
})
export class Facturas {
  private service = inject(InvoiceService);
  private auth = inject(AuthService);

  readonly facturas = signal<Invoice[]>([]);
  readonly loading = signal(true);
  readonly esAdmin = this.auth.role() === UserRole.ADMIN;
  readonly esRecepcion = this.auth.role() === UserRole.RECEPCIONISTA;
  readonly esPaciente = this.auth.role() === UserRole.PACIENTE;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (f) => {
        this.facturas.set(f);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  pagar(f: Invoice): void {
    this.service.marcarPagada(f._id).subscribe({ next: () => this.load() });
  }

  anular(f: Invoice): void {
    this.service.anular(f._id).subscribe({ next: () => this.load() });
  }

  reembolsar(f: Invoice): void {
    this.service.reembolsar(f._id).subscribe({ next: () => this.load() });
  }

  descargarPdf(f: Invoice): void {
    this.service.descargarPdf(f);
  }

  estadoLabel(e: string): string {
    return (
      { pendiente: 'Pendiente', pagada: 'Pagada', anulada: 'Anulada', reembolsada: 'Reembolsada' }[
        e
      ] ?? e
    );
  }
}
