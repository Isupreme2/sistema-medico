import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../login/login.scss', './register.scss'],
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    tipoDocumento: ['DNI' as 'DNI' | 'CE' | 'PAS', [Validators.required]],
    numeroDocumento: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]],
    fechaNacimiento: [''],
    sexo: ['' as '' | 'M' | 'F' | 'O'],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
      ],
    ],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    this.auth
      .register({
        nombre: v.nombre,
        apellido: v.apellido,
        email: v.email,
        telefono: v.telefono || undefined,
        tipoDocumento: v.tipoDocumento,
        numeroDocumento: v.numeroDocumento,
        fechaNacimiento: v.fechaNacimiento || undefined,
        sexo: v.sexo || undefined,
        password: v.password,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/login'], { queryParams: { registered: '1' } });
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(err.error?.message ?? 'No se pudo completar el registro');
        },
      });
  }
}
