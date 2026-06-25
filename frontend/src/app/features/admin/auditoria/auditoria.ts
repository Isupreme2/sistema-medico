import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditService } from '../../../core/services/audit.service';
import { AuditPage } from '../../../core/models/audit.model';

@Component({
  selector: 'app-auditoria',
  imports: [DatePipe],
  templateUrl: './auditoria.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './auditoria.scss',
})
export class Auditoria {
  private service = inject(AuditService);

  readonly page = signal<AuditPage | null>(null);
  readonly loading = signal(true);
  readonly metodo = signal<string>('');
  readonly rol = signal<string>('');
  private current = 1;

  constructor() {
    this.load(1);
  }

  load(p: number): void {
    this.current = p;
    this.loading.set(true);
    this.service
      .list({ metodo: this.metodo() || undefined, rol: this.rol() || undefined, page: p })
      .subscribe({
        next: (data) => {
          this.page.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  filtrarMetodo(m: string): void {
    this.metodo.set(m);
    this.load(1);
  }
  filtrarRol(r: string): void {
    this.rol.set(r);
    this.load(1);
  }

  anterior(): void {
    if (this.current > 1) this.load(this.current - 1);
  }
  siguiente(): void {
    const p = this.page();
    if (p && this.current < p.paginas) this.load(this.current + 1);
  }
}
