import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

/**
 * Pasarela de pago SIMULADA (demo). No procesa pagos reales: su único fin es
 * demostrar que el flujo es escalable a una pasarela real (Culqi, Niubiz, etc.).
 * Muestra un formulario de tarjeta, simula el procesamiento y confirma el pago.
 */
@Component({
  selector: 'app-payment-gateway',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="pg-overlay" (click)="onBackdrop($event)">
      <div class="pg-modal" role="dialog" aria-modal="true">
        <header class="pg-head">
          <div class="pg-brand">
            <span class="pg-dot"></span> Pasarela de pago
            <span class="pg-demo">DEMO</span>
          </div>
          <button class="pg-close" type="button" (click)="cerrado.emit()" aria-label="Cerrar">✕</button>
        </header>

        @if (estado() === 'ok') {
          <div class="pg-ok">
            <div class="pg-check">✓</div>
            <h3>Pago aprobado</h3>
            <p>Se procesó S/ {{ monto().toFixed(2) }} por {{ concepto() }}.</p>
            <button class="pg-btn" type="button" (click)="pagado.emit()">Listo</button>
          </div>
        } @else {
          <div class="pg-amount">
            <span>{{ concepto() }}</span>
            <strong>S/ {{ monto().toFixed(2) }}</strong>
          </div>

          <form [formGroup]="form" (ngSubmit)="pagar()">
            <label class="pg-field">
              <span>Titular de la tarjeta</span>
              <input type="text" formControlName="titular" placeholder="NOMBRE APELLIDO" autocomplete="cc-name" />
            </label>
            <label class="pg-field">
              <span>Número de tarjeta</span>
              <input
                type="text"
                inputmode="numeric"
                maxlength="23"
                placeholder="4242 4242 4242 4242"
                [value]="numeroFmt()"
                (input)="onNumero($any($event.target).value)"
                autocomplete="cc-number"
              />
            </label>
            <div class="pg-row">
              <label class="pg-field">
                <span>Vencimiento</span>
                <input
                  type="text"
                  maxlength="5"
                  placeholder="MM/AA"
                  [value]="vencFmt()"
                  (input)="onVenc($any($event.target).value)"
                  autocomplete="cc-exp"
                />
              </label>
              <label class="pg-field">
                <span>CVV</span>
                <input type="text" inputmode="numeric" maxlength="4" formControlName="cvv" placeholder="123" autocomplete="cc-csc" />
              </label>
            </div>

            @if (error()) {
              <p class="pg-err">{{ error() }}</p>
            }

            <button class="pg-btn" type="submit" [disabled]="estado() === 'procesando'">
              {{ estado() === 'procesando' ? 'Procesando…' : 'Pagar S/ ' + monto().toFixed(2) }}
            </button>
            <p class="pg-note">🔒 Pago cifrado simulado. No se cobra dinero real (demo académica).</p>
          </form>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .pg-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(3px);
        display: grid;
        place-items: center;
        padding: 1rem;
      }
      .pg-modal {
        width: 100%;
        max-width: 420px;
        background: #fff;
        border-radius: 1.25rem;
        box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.4);
        padding: 1.5rem;
        font-family: 'Inter', sans-serif;
      }
      .pg-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
      }
      .pg-brand {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 700;
        color: var(--slate-900);
      }
      .pg-dot {
        width: 0.7rem;
        height: 0.7rem;
        border-radius: 999px;
        background: var(--brand);
      }
      .pg-demo {
        font-size: 0.6rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: var(--brand);
        background: var(--brand-soft);
        padding: 0.1rem 0.4rem;
        border-radius: 999px;
      }
      .pg-close {
        border: none;
        background: none;
        font-size: 1rem;
        color: var(--slate-400);
        cursor: pointer;
      }
      .pg-amount {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        padding: 0.9rem 1rem;
        background: var(--slate-50);
        border-radius: 0.75rem;
        margin-bottom: 1.25rem;
        span {
          color: var(--slate-600);
          font-size: 0.9rem;
        }
        strong {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.25rem;
          color: var(--slate-900);
        }
      }
      .pg-field {
        display: block;
        margin-bottom: 0.85rem;
        span {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--slate-500);
          margin-bottom: 0.35rem;
        }
        input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.65rem 0.8rem;
          border: 1px solid var(--slate-200);
          border-radius: 0.65rem;
          font: inherit;
          letter-spacing: 0.02em;
          &:focus {
            outline: none;
            border-color: var(--brand);
            box-shadow: 0 0 0 3px color-mix(in oklch, var(--brand) 18%, transparent);
          }
        }
      }
      .pg-row {
        display: flex;
        gap: 0.85rem;
        .pg-field {
          flex: 1;
        }
      }
      .pg-btn {
        width: 100%;
        margin-top: 0.5rem;
        padding: 0.8rem;
        border: none;
        border-radius: 0.75rem;
        background: var(--brand);
        color: #fff;
        font-weight: 700;
        font-size: 0.98rem;
        cursor: pointer;
        transition: background 0.15s;
        &:hover:not(:disabled) {
          background: var(--brand-dark);
        }
        &:disabled {
          opacity: 0.7;
          cursor: default;
        }
      }
      .pg-note {
        margin: 0.75rem 0 0;
        font-size: 0.72rem;
        color: var(--slate-400);
        text-align: center;
      }
      .pg-err {
        margin: 0 0 0.5rem;
        font-size: 0.82rem;
        color: #dc2626;
        font-weight: 500;
      }
      .pg-ok {
        text-align: center;
        padding: 1.5rem 0 0.5rem;
        h3 {
          margin: 0.5rem 0 0.25rem;
          font-size: 1.3rem;
        }
        p {
          margin: 0 0 1.5rem;
          color: var(--slate-600);
          font-size: 0.9rem;
        }
      }
      .pg-check {
        width: 3.5rem;
        height: 3.5rem;
        margin: 0 auto;
        border-radius: 999px;
        background: color-mix(in oklch, var(--brand) 12%, transparent);
        color: var(--brand);
        display: grid;
        place-items: center;
        font-size: 1.75rem;
      }
    `,
  ],
})
export class PaymentGateway {
  private fb = inject(FormBuilder);

  readonly monto = input<number>(0);
  readonly concepto = input<string>('Consulta médica');

  readonly pagado = output<void>();
  readonly cerrado = output<void>();

  readonly estado = signal<'form' | 'procesando' | 'ok'>('form');
  readonly error = signal<string | null>(null);
  readonly numeroFmt = signal('');
  readonly vencFmt = signal('');

  readonly form = this.fb.nonNullable.group({
    titular: ['', [Validators.required]],
    numero: ['', [Validators.required]],
    vencimiento: ['', [Validators.required]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
  });

  /** Formatea el número de tarjeta en grupos de 4 mientras se escribe. */
  onNumero(value: string): void {
    const soloDigitos = value.replace(/\D/g, '').slice(0, 19);
    const agrupado = soloDigitos.replace(/(.{4})/g, '$1 ').trim();
    this.numeroFmt.set(agrupado);
    this.form.controls.numero.setValue(soloDigitos);
  }

  /** Formatea el vencimiento como MM/AA. */
  onVenc(value: string): void {
    const d = value.replace(/\D/g, '').slice(0, 4);
    const fmt = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    this.vencFmt.set(fmt);
    this.form.controls.vencimiento.setValue(fmt);
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('pg-overlay') && this.estado() !== 'procesando') {
      this.cerrado.emit();
    }
  }

  pagar(): void {
    this.error.set(null);
    const numero = this.form.controls.numero.value.replace(/\s/g, '');
    if (this.form.controls.titular.invalid) {
      this.error.set('Ingresa el titular de la tarjeta.');
      return;
    }
    if (numero.length < 13 || numero.length > 19) {
      this.error.set('Número de tarjeta inválido.');
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(this.form.controls.vencimiento.value)) {
      this.error.set('Vencimiento inválido (MM/AA).');
      return;
    }
    if (this.form.controls.cvv.invalid) {
      this.error.set('CVV inválido.');
      return;
    }
    // Simulación de procesamiento de la pasarela.
    this.estado.set('procesando');
    setTimeout(() => this.estado.set('ok'), 1700);
  }
}
