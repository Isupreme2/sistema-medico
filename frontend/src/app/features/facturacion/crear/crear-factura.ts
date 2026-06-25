import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvoiceService } from '../../../core/services/invoice.service';
import { Invoice } from '../../../core/models/invoice.model';

@Component({
  selector: 'app-crear-factura',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './crear-factura.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './crear-factura.scss',
})
export class CrearFactura {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private service = inject(InvoiceService);

  readonly appointmentId = this.route.snapshot.paramMap.get('appointmentId') ?? '';
  readonly nombrePaciente = this.route.snapshot.queryParamMap.get('nombre') ?? '';

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly emitida = signal<Invoice | null>(null);

  readonly form = this.fb.group({
    impuestoPct: [18, [Validators.min(0), Validators.max(100)]],
    notas: [''],
    items: this.fb.array([this.nuevoItem()]),
  });

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  private nuevoItem() {
    return this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(300)]],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      precioUnitario: [0, [Validators.required, Validators.min(0)]],
    });
  }

  agregarItem(): void {
    this.items.push(this.nuevoItem());
  }

  quitarItem(i: number): void {
    if (this.items.length > 1) this.items.removeAt(i);
  }

  get subtotal(): number {
    return this.items.controls.reduce((acc, c) => {
      const v = c.value;
      return acc + (Number(v.cantidad) || 0) * (Number(v.precioUnitario) || 0);
    }, 0);
  }
  get impuesto(): number {
    return Math.round(this.subtotal * ((this.form.value.impuestoPct ?? 0) / 100) * 100) / 100;
  }
  get total(): number {
    return Math.round((this.subtotal + this.impuesto) * 100) / 100;
  }

  emitir(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    this.service
      .crear({
        citaId: this.appointmentId,
        impuestoPct: v.impuestoPct ?? 18,
        notas: v.notas || undefined,
        conceptos: v.items.map((it) => ({
          descripcion: it.descripcion!,
          cantidad: Number(it.cantidad),
          precioUnitario: Number(it.precioUnitario),
        })),
      })
      .subscribe({
        next: (f) => {
          this.emitida.set(f);
          this.saving.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message ?? 'No se pudo emitir la factura.');
          this.saving.set(false);
        },
      });
  }
}
