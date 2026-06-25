import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicLayout } from '../public-layout';

@Component({
  selector: 'app-citas',
  imports: [PublicLayout, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-public-layout>
      <section class="section section--slate">
        <div class="container citas-grid" style="max-width:64rem;display:grid;gap:3rem;align-items:start">
          <div>
            <span class="eyebrow">Reservas en línea</span>
            <h1 class="h-page">Agenda tu cita</h1>
            <p class="muted" style="margin-bottom:2rem">
              La reserva de citas se realiza desde tu portal de paciente: elige médico, fecha y
              horario disponible en tiempo real. Inicia sesión o crea tu cuenta para empezar.
            </p>
            <div class="flex gap wrap" style="margin-bottom:2.5rem">
              <a class="btn btn--brand" routerLink="/register">Registrarme como paciente</a>
              <a class="btn btn--outline" routerLink="/login">Ya tengo cuenta</a>
            </div>
            <a class="btn btn--dark" href="https://wa.me/51932101485" target="_blank" rel="noopener">
              ¿Dudas? Escríbenos por WhatsApp
            </a>
            <div style="margin-top:2.5rem;padding:1.5rem;background:color-mix(in oklch,var(--brand) 5%,transparent);border:1px solid color-mix(in oklch,var(--brand) 20%,transparent);border-radius:1rem">
              <p style="margin:0 0 .25rem;font-size:.88rem;font-weight:700;color:var(--brand)">Emergencias 24/7</p>
              <a href="tel:+51932101485" style="font-family:'Plus Jakarta Sans',sans-serif;font-size:1.5rem;font-weight:800;color:var(--slate-900);text-decoration:none">+51 932 101 485</a>
            </div>
          </div>

          <div class="card" style="padding:2.5rem">
            <h2 class="h-sec" style="font-size:1.5rem">¿Cómo funciona?</h2>
            <ol style="margin:1rem 0 0;padding-left:1.2rem;color:var(--slate-600);line-height:2">
              <li><strong style="color:var(--slate-900)">Crea tu cuenta</strong> con tus datos y documento de identidad.</li>
              <li><strong style="color:var(--slate-900)">Elige especialista, fecha y hora</strong> según la disponibilidad real.</li>
              <li><strong style="color:var(--slate-900)">Paga tu consulta</strong> en línea de forma segura.</li>
              <li><strong style="color:var(--slate-900)">Recibe la confirmación</strong> y, si es teleconsulta, tu enlace de video.</li>
            </ol>
          </div>
        </div>
      </section>
    </app-public-layout>
  `,
  styles: [
    `
      @media (min-width: 1024px) {
        .citas-grid {
          grid-template-columns: 3fr 2fr;
        }
      }
    `,
  ],
})
export class Citas {}
