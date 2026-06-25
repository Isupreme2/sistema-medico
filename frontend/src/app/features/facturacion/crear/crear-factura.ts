import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';
import { InvoiceService } from '../../../core/services/invoice.service';
import { PatientService } from '../../../core/services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole, PatientLite } from '../../../core/models/user.model';
import { Invoice, CreateInvoicePayload } from '../../../core/models/invoice.model';

@Component({
  selector: 'app-crear-factura',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './crear-factura.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './crear-factura.scss',
})
export class CrearFactura {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private service = inject(InvoiceService);
  private patients = inject(PatientService);
  private auth = inject(AuthService);

  readonly appointmentId = this.route.snapshot.paramMap.get('appointmentId') ?? '';
  readonly nombrePaciente = this.route.snapshot.queryParamMap.get('nombre') ?? '';
  /** Modo "sin cita": el gestor elige un paciente y se factura directo (walk-in). */
  readonly sinCita = !this.appointmentId;

  // Búsqueda de paciente (solo en modo sin cita).
  readonly q = signal('');
  readonly pacientes = signal<PatientLite[]>([]);
  readonly paciente = signal<PatientLite | null>(null);
  private search$ = new Subject<string>();

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly emitida = signal<Invoice | null>(null);

  readonly form = this.fb.group({
    impuestoPct: [18, [Validators.min(0), Validators.max(100)]],
    notas: [''],
    items: this.fb.array([this.nuevoItem()]),
  });

  constructor() {
    if (this.sinCita) {
      this.search$
        .pipe(
          debounceTime(250),
          switchMap((q) => this.patients.search(q).pipe(catchError(() => of([] as PatientLite[])))),
          takeUntilDestroyed(),
        )
        .subscribe((p) => this.pacientes.set(p));
    }
  }

  onSearch(value: string): void {
    this.q.set(value);
    if (!value.trim()) {
      this.pacientes.set([]);
      return;
    }
    this.search$.next(value);
  }

  seleccionar(p: PatientLite): void {
    this.paciente.set(p);
    this.pacientes.set([]);
    this.q.set('');
  }

  limpiarPaciente(): void {
    this.paciente.set(null);
  }

  /** Página de facturas según el rol (para los enlaces de retorno). */
  get facturasLink(): string {
    switch (this.auth.role()) {
      case UserRole.ADMIN:
        return '/admin/facturacion';
      case UserRole.RECEPCIONISTA:
        return '/recepcion/facturacion';
      default:
        return '/medico/facturas';
    }
  }

  get volverLink(): string {
    switch (this.auth.role()) {
      case UserRole.ADMIN:
        return '/admin/facturacion';
      case UserRole.RECEPCIONISTA:
        return '/recepcion/citas';
      default:
        return '/medico/agenda';
    }
  }

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
    if (this.sinCita && !this.paciente()) {
      this.error.set('Selecciona un paciente para facturar.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const payload: CreateInvoicePayload = {
      impuestoPct: v.impuestoPct ?? 18,
      notas: v.notas || undefined,
      conceptos: v.items.map((it) => ({
        descripcion: it.descripcion!,
        cantidad: Number(it.cantidad),
        precioUnitario: Number(it.precioUnitario),
      })),
    };
    if (this.appointmentId) {
      payload.citaId = this.appointmentId;
    } else {
      payload.pacienteId = this.paciente()!._id;
    }
    this.service.crear(payload).subscribe({
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
