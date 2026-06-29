import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicLayout } from '../public-layout';
import { SpecialtyService } from '../../../core/services/specialty.service';

interface Spec {
  name: string;
  dot: string;
  soft: string;
  text: string;
}

@Component({
  selector: 'app-home',
  imports: [PublicLayout, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-public-layout>
      <!-- Hero -->
      <section class="hero">
        <div class="container hero__grid">
          <div>
            <div class="hero__badge">
              <span class="ping"></span>
              Atención en Casma, Áncash
            </div>
            <h1 class="hero__title">
              Tu salud merece <span class="text-brand">tecnología</span> y calidez humana.
            </h1>
            <p class="lead" style="max-width:32rem;margin-bottom:2rem">
              Especialistas de primer nivel con equipamiento de última generación. Cuidamos de ti
              y tu familia con el respaldo que Áncash confía.
            </p>
            <div class="flex gap wrap">
              <a class="btn btn--dark" href="https://wa.me/51932101485" target="_blank" rel="noopener">
                Agenda por WhatsApp
              </a>
              <a class="btn btn--outline" routerLink="/especialidades">Ver Especialidades</a>
            </div>
          </div>

          <div class="hero__img-wrap">
            <div class="glow"></div>
            <img
              src="/assets/hero-clinic.jpg"
              alt="Recepción moderna de la Clínica Cordillera"
            />
          </div>
        </div>
      </section>

      <!-- Especialidades -->
      @if (specialties().length) {
        <section class="section section--white">
          <div class="container">
            <div class="flex wrap" style="justify-content:space-between;align-items:flex-end;gap:1.5rem;margin-bottom:4rem">
              <div style="max-width:36rem">
                <h2 class="h-sec">Nuestras Especialidades</h2>
                <p class="muted">
                  Ofrecemos un enfoque integral para el diagnóstico y tratamiento de diversas
                  patologías con expertos en cada área.
                </p>
              </div>
              <a class="text-brand" style="font-weight:700;text-decoration:none" routerLink="/especialidades">
                Ver todas las áreas →
              </a>
            </div>

            <div class="grid grid--3">
              @for (s of specialties(); track s.name) {
                <div class="card card--soft">
                  <div class="icon-tile">
                    <span class="dot" [style.background]="s.soft" style="width:1.5rem;height:1.5rem;display:grid;place-items:center">
                      <span class="dot" [style.background]="s.dot"></span>
                    </span>
                  </div>
                  <h3>{{ s.name }}</h3>
                  <p>{{ s.text }}</p>
                </div>
              }
            </div>
          </div>
        </section>
      }

      <!-- Contacto -->
      <section class="section">
        <div class="container">
          <div class="card" style="padding:0;overflow:hidden;border-radius:2.5rem;box-shadow:0 1px 3px rgba(0,0,0,.06)">
            <div class="contact-split" style="display:grid">
              <div style="padding:3rem">
                <h2 class="h-sec">Contáctanos</h2>
                <div style="display:flex;flex-direction:column;gap:2rem">
                  @for (c of contacto; track c.t) {
                    <div style="display:flex;gap:1rem;align-items:flex-start">
                      <div style="width:2.5rem;height:2.5rem;border-radius:999px;background:var(--slate-50);display:grid;place-items:center">{{ c.icon }}</div>
                      <div>
                        <p style="margin:0;font-weight:700">{{ c.t }}</p>
                        <p style="margin:0;color:var(--slate-500);font-size:.88rem" [innerHTML]="c.v"></p>
                      </div>
                    </div>
                  }
                </div>
                <div style="margin-top:3rem;padding:1.5rem;background:var(--brand);border-radius:1rem;color:#fff">
                  <p style="margin:0 0 .25rem;opacity:.9;font-size:.88rem">¿Necesitas una cita rápida?</p>
                  <p style="margin:0 0 1rem;font-size:1.25rem;font-weight:700">Escríbenos por WhatsApp</p>
                  <a class="btn btn--block" style="background:#fff;color:var(--brand)" href="https://wa.me/51932101485" target="_blank" rel="noopener">Iniciar Chat</a>
                </div>
              </div>
              <div style="min-height:400px;background:var(--slate-100)">
                <iframe
                  title="Ubicación Clínica Cordillera"
                  src="https://www.google.com/maps?q=Casma,Ancash,Peru&output=embed"
                  style="width:100%;height:100%;min-height:400px;border:0"
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>
    </app-public-layout>
  `,
  styles: [
    `
      @media (min-width: 1024px) {
        .contact-split {
          grid-template-columns: 2fr 3fr;
        }
      }
    `,
  ],
})
export class Home {
  private specialtyService = inject(SpecialtyService);

  /** Especialidades con médico activo (para no destacar áreas sin profesional). */
  private readonly ofertadas = signal<string[]>([]);

  private readonly destacadas: Spec[] = [
    { name: 'Cardiología', dot: '#ef4444', soft: 'rgba(239,68,68,.2)', text: 'Cuidado preventivo y tratamiento avanzado para la salud de tu corazón con tecnología no invasiva.' },
    { name: 'Pediatría', dot: '#3b82f6', soft: 'rgba(59,130,246,.2)', text: 'Atención especializada para el crecimiento y bienestar de los más pequeños con un trato dulce y profesional.' },
    { name: 'Fisioterapia', dot: '#14b8a6', soft: 'rgba(20,184,166,.2)', text: 'Recuperación funcional y rehabilitación física con programas personalizados para deportistas y pacientes crónicos.' },
  ];

  /** Solo las destacadas que tengan un médico activo asignado. */
  readonly specialties = computed<Spec[]>(() => {
    const oferta = this.ofertadas().map((o) => o.toLowerCase());
    return this.destacadas.filter((s) => {
      const n = s.name.toLowerCase();
      return oferta.some((o) => o.includes(n) || n.includes(o));
    });
  });

  constructor() {
    this.specialtyService.conMedicos().subscribe({
      next: (nombres) => this.ofertadas.set(nombres),
      error: () => this.ofertadas.set([]),
    });
  }

  readonly contacto = [
    { t: 'Ubicación', v: 'Av. Gamarra<br>Casma – Casma – Áncash', icon: '📍' },
    { t: 'Teléfono', v: '+51 932 101 485', icon: '📞' },
    { t: 'WhatsApp', v: '+51 932 101 485', icon: '💬' },
  ];
}
