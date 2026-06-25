import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PublicLayout } from '../public-layout';

@Component({
  selector: 'app-citas',
  imports: [PublicLayout, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-public-layout>
      <section class="section section--slate">
        <div class="container citas-grid" style="max-width:64rem;display:grid;gap:3rem">
          <div>
            <span class="eyebrow">Reservas</span>
            <h1 class="h-page">Agenda tu cita</h1>
            <p class="muted" style="margin-bottom:2rem">
              Completa el formulario y te confirmaremos la disponibilidad en menos de 24 horas
              hábiles. ¿Prefieres atención inmediata?
            </p>
            <a class="btn btn--dark" href="https://wa.me/51987654321" target="_blank" rel="noopener">
              Escribir por WhatsApp
            </a>
            <div style="margin-top:2.5rem;padding:1.5rem;background:color-mix(in oklch,var(--brand) 5%,transparent);border:1px solid color-mix(in oklch,var(--brand) 20%,transparent);border-radius:1rem">
              <p style="margin:0 0 .25rem;font-size:.88rem;font-weight:700;color:var(--brand)">Emergencias 24/7</p>
              <a href="tel:+5104412345" style="font-family:'Plus Jakarta Sans',sans-serif;font-size:1.5rem;font-weight:800;color:var(--slate-900);text-decoration:none">(044) 123-456</a>
            </div>
          </div>

          <div class="card" style="padding:2.5rem">
            @if (sent()) {
              <div style="text-align:center;padding:3rem 0">
                <div style="width:4rem;height:4rem;margin:0 auto 1rem;border-radius:999px;background:color-mix(in oklch,var(--brand) 10%,transparent);color:var(--brand);display:grid;place-items:center;font-size:1.75rem">✓</div>
                <h2 class="h-sec" style="font-size:1.5rem">¡Solicitud enviada!</h2>
                <p class="muted">Te contactaremos pronto para confirmar tu cita.</p>
              </div>
            } @else {
              <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:1.25rem">
                <div class="grid--2" style="display:grid;gap:1.25rem">
                  <div class="form-field">
                    <label>Nombre completo</label>
                    <input type="text" formControlName="nombre" />
                  </div>
                  <div class="form-field">
                    <label>Teléfono</label>
                    <input type="tel" formControlName="telefono" />
                  </div>
                </div>
                <div class="form-field">
                  <label>Correo electrónico</label>
                  <input type="email" formControlName="correo" />
                </div>
                <div class="grid--2" style="display:grid;gap:1.25rem">
                  <div class="form-field">
                    <label>Especialidad</label>
                    <select formControlName="especialidad">
                      <option value="">Selecciona...</option>
                      @for (e of especialidades; track e) {
                        <option [value]="e">{{ e }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-field">
                    <label>Fecha preferida</label>
                    <input type="date" formControlName="fecha" />
                  </div>
                </div>
                <div class="form-field">
                  <label>Mensaje (opcional)</label>
                  <textarea rows="4" maxlength="500" formControlName="mensaje"></textarea>
                </div>
                @if (error()) {
                  <p style="margin:0;font-size:.88rem;color:#dc2626;font-weight:500">{{ error() }}</p>
                }
                <button type="submit" class="btn btn--brand btn--block">Solicitar Cita</button>
                <p style="margin:0;font-size:.75rem;color:var(--slate-400);text-align:center">
                  Al enviar aceptas nuestra política de privacidad y el tratamiento de datos
                  sensibles según la Ley General de Salud del Perú.
                </p>
              </form>
            }
          </div>
        </div>
      </section>
    </app-public-layout>
  `,
  styles: [
    `
      @media (min-width: 1024px) {
        .citas-grid {
          grid-template-columns: 2fr 3fr;
        }
      }
    `,
  ],
})
export class Citas {
  private fb = inject(FormBuilder);

  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  readonly especialidades = [
    'Cardiología',
    'Pediatría',
    'Ginecología',
    'Medicina Interna',
    'Fisioterapia',
    'Dermatología',
    'Traumatología',
    'Gastroenterología',
  ];

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.required, Validators.minLength(6)]],
    correo: ['', [Validators.required, Validators.email]],
    especialidad: ['', [Validators.required]],
    fecha: ['', [Validators.required]],
    mensaje: [''],
  });

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los datos del formulario.');
      return;
    }
    // Demo público: no se envía a backend, solo confirma la solicitud.
    this.sent.set(true);
  }
}
