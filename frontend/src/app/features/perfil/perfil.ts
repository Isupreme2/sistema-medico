import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h1>Mi perfil</h1>
    <p class="lead">Gestiona tus datos de contacto y la seguridad de tu cuenta.</p>

    <div class="grid">
      <!-- Datos -->
      <section class="card">
        <h2>Datos de la cuenta</h2>
        <div class="ro">
          <span>Nombre</span><strong>{{ user()?.nombre }} {{ user()?.apellido }}</strong>
        </div>
        <div class="ro"><span>Correo</span><strong>{{ user()?.email }}</strong></div>
        <div class="ro"><span>Rol</span><strong>{{ user()?.rol }}</strong></div>

        <form [formGroup]="telForm" (ngSubmit)="guardarTelefono()">
          <label class="field">
            <span>Teléfono</span>
            <input type="tel" formControlName="telefono" placeholder="999888777" />
          </label>
          @if (telMsg()) { <p class="ok">{{ telMsg() }}</p> }
          <button class="btn" type="submit" [disabled]="telSaving()">
            {{ telSaving() ? 'Guardando…' : 'Guardar teléfono' }}
          </button>
        </form>
      </section>

      <!-- Seguridad / 2FA -->
      <section class="card">
        <h2>Seguridad — Verificación en dos pasos (2FA)</h2>

        @if (user()?.dosFactores?.habilitado || activado()) {
          <p class="estado on">🔒 2FA activado. Al iniciar sesión se te pedirá un código.</p>
        } @else {
          <p class="muted">
            Añade una capa extra de seguridad con una app de autenticación
            (Google Authenticator, Authy, etc.).
          </p>

          @if (qr(); as q) {
            <div class="twofa">
              <p class="muted">1. Escanea el código con tu app de autenticación:</p>
              <img [src]="q" alt="Código QR para 2FA" class="qr" />
              <p class="muted">2. Ingresa el código de 6 dígitos que muestra la app:</p>
              <form [formGroup]="totpForm" (ngSubmit)="confirmar2FA()">
                <input class="totp" formControlName="totp" placeholder="123456" maxlength="6" inputmode="numeric" />
                @if (error()) { <p class="err">{{ error() }}</p> }
                <button class="btn" type="submit" [disabled]="confirmando()">
                  {{ confirmando() ? 'Verificando…' : 'Activar 2FA' }}
                </button>
              </form>
            </div>
          } @else {
            <button class="btn" type="button" (click)="iniciar2FA()" [disabled]="iniciando()">
              {{ iniciando() ? 'Generando…' : 'Activar 2FA' }}
            </button>
            @if (error()) { <p class="err">{{ error() }}</p> }
          }
        }
      </section>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      h1 { margin: 0; color: var(--slate-900); }
      .lead { margin: 0.3rem 0 1.5rem; color: var(--slate-500); }
      .grid { display: grid; gap: 1.25rem; grid-template-columns: 1fr; max-width: 760px; }
      @media (min-width: 760px) { .grid { grid-template-columns: 1fr 1fr; } }
      .card {
        background: #fff;
        border: 1.5px solid #93c5fd;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.06);
        transition: box-shadow 0.15s;
      }
      .card:hover {
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.1);
      }
      h2 { margin: 0 0 1rem; font-size: 1.05rem; color: var(--slate-800); }
      .ro {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e0e7ff;
        font-size: 0.9rem;
      }
      .ro span { color: var(--slate-500); }
      .ro strong { color: var(--slate-800); }
      .field { display: block; margin: 1rem 0 0.75rem; }
      .field span {
        display: block;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--slate-700);
        margin-bottom: 0.35rem;
      }
      .field input, .totp {
        width: 100%;
        box-sizing: border-box;
        padding: 0.6rem 0.8rem;
        border: 1.5px solid #bfdbfe;
        border-radius: 8px;
        font: inherit;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .totp {
        letter-spacing: 0.3em;
        text-align: center;
        font-size: 1.2rem;
        margin: 0.5rem 0;
      }
      .field input:focus, .totp:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }
      .btn {
        border: none;
        background: #2563eb;
        color: #fff;
        font-weight: 700;
        padding: 0.65rem 1.2rem;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .btn:hover:not(:disabled) {
        background: #1d4ed8;
        transform: translateY(-1px);
      }
      .btn:disabled { opacity: 0.6; cursor: default; }
      .muted { color: var(--slate-500); font-size: 0.9rem; }
      .ok { color: #047857; font-size: 0.85rem; font-weight: 500; }
      .err { color: #dc2626; font-size: 0.85rem; }
      .estado.on { color: #047857; font-weight: 600; }
      .qr {
        width: 160px;
        height: 160px;
        display: block;
        margin: 0.5rem 0 1rem;
        border: 1.5px solid #93c5fd;
        border-radius: 10px;
      }
    `,
  ],
})
export class Perfil {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  readonly user = this.auth.user;

  readonly telForm = this.fb.nonNullable.group({
    telefono: [this.user()?.telefono ?? ''],
  });
  readonly telSaving = signal(false);
  readonly telMsg = signal<string | null>(null);

  // 2FA
  readonly qr = signal<string | null>(null);
  readonly iniciando = signal(false);
  readonly confirmando = signal(false);
  readonly activado = signal(false);
  readonly error = signal<string | null>(null);
  readonly totpForm = this.fb.nonNullable.group({
    totp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  guardarTelefono(): void {
    this.telSaving.set(true);
    this.telMsg.set(null);
    this.auth.updateMe({ telefono: this.telForm.controls.telefono.value }).subscribe({
      next: () => {
        this.telSaving.set(false);
        this.telMsg.set('Teléfono actualizado.');
      },
      error: () => this.telSaving.set(false),
    });
  }

  iniciar2FA(): void {
    this.iniciando.set(true);
    this.error.set(null);
    this.auth.setup2FA().subscribe({
      next: (d) => {
        this.qr.set(d.qrDataUrl);
        this.iniciando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.iniciando.set(false);
        this.error.set(err.error?.message ?? 'No se pudo iniciar 2FA');
      },
    });
  }

  confirmar2FA(): void {
    if (this.totpForm.invalid) {
      this.totpForm.markAllAsTouched();
      this.error.set('Ingresa el código de 6 dígitos.');
      return;
    }
    this.confirmando.set(true);
    this.error.set(null);
    this.auth.enable2FA(this.totpForm.controls.totp.value).subscribe({
      next: () => {
        this.confirmando.set(false);
        this.activado.set(true);
        this.qr.set(null);
        this.auth.fetchMe().subscribe();
      },
      error: (err: HttpErrorResponse) => {
        this.confirmando.set(false);
        this.error.set(err.error?.message ?? 'Código inválido');
      },
    });
  }
}
