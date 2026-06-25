import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicLayout } from '../public-layout';

interface Spec {
  name: string;
  dot: string;
  soft: string;
  text: string;
}
interface Doc {
  name: string;
  spec: string;
  cmp: string;
  rne: string;
  initials: string;
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
              Atención Inmediata en Ancash
            </div>
            <h1 class="hero__title">
              Tu salud merece <span class="text-brand">tecnología</span> y calidez humana.
            </h1>
            <p class="lead" style="max-width:32rem;margin-bottom:2rem">
              Especialistas de primer nivel con equipamiento de última generación. Cuidamos de ti
              y tu familia con el respaldo que Ancash confía.
            </p>
            <div class="flex gap wrap">
              <a class="btn btn--dark" href="https://wa.me/51987654321" target="_blank" rel="noopener">
                Agenda por WhatsApp
              </a>
              <a class="btn btn--outline" routerLink="/especialidades">Ver Especialidades</a>
            </div>

            <div class="avatars">
              <div class="stack">
                <span class="av" style="background:color-mix(in oklch,var(--brand) 20%,transparent);color:var(--brand)">EM</span>
                <span class="av" style="background:color-mix(in oklch,var(--accent) 20%,transparent);color:var(--slate-900)">RP</span>
                <span class="av" style="background:var(--slate-400);color:#fff;font-size:.62rem">+25</span>
              </div>
              <div style="font-size:.9rem">
                <p style="margin:0;font-weight:700">Médicos Especialistas</p>
                <p style="margin:0;color:var(--slate-500)">Certificados por el CMP</p>
              </div>
            </div>
          </div>

          <div class="hero__img-wrap">
            <div class="glow"></div>
            <img
              src="/assets/hero-clinic.jpg"
              alt="Recepción moderna de la Clínica Cordillera con vista a la Cordillera Blanca"
            />
          </div>
        </div>
      </section>

      <!-- Especialidades -->
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
            @for (s of specialties; track s.name) {
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

      <!-- Equipo (oscuro) -->
      <section class="section section--dark">
        <div class="container split" style="display:grid;gap:4rem;align-items:center">
          <div>
            <h2 class="h-sec" style="font-size:2.25rem">Nuestros Especialistas</h2>
            <p style="color:var(--slate-400);font-size:1.1rem;margin-bottom:2.5rem;line-height:1.7">
              Un equipo multidisciplinario comprometido con la excelencia médica. Cada uno de
              nuestros doctores cuenta con certificación vigente y amplia trayectoria.
            </p>

            <div style="display:flex;flex-direction:column;gap:1.5rem">
              @for (d of doctors; track d.name) {
                <div class="doc-row">
                  <div class="av-lg">{{ d.initials }}</div>
                  <div>
                    <h4 style="margin:0;font-size:1.1rem">{{ d.name }}</h4>
                    <p class="text-brand" style="font-size:.88rem;font-weight:500;margin:.15rem 0 .5rem">{{ d.spec }}</p>
                    <div style="display:flex;gap:1rem;font-size:.75rem;color:var(--slate-400)">
                      <span>{{ d.cmp }}</span><span>{{ d.rne }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>

            <a routerLink="/equipo" style="margin-top:2.5rem;display:inline-block;color:#fff;border-bottom:2px solid var(--brand);padding-bottom:.25rem;font-weight:700;text-decoration:none">
              Ver staff completo
            </a>
          </div>

          <div style="position:relative">
            <img
              src="/assets/tech-medical.jpg"
              alt="Equipamiento de imagenología médica de última generación"
              loading="lazy"
              style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:1.5rem;border:1px solid rgba(255,255,255,.05)"
            />
          </div>
        </div>
      </section>

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
                  <a class="btn btn--block" style="background:#fff;color:var(--brand)" href="https://wa.me/51987654321" target="_blank" rel="noopener">Iniciar Chat</a>
                </div>
              </div>
              <div style="min-height:400px;background:var(--slate-100)">
                <iframe
                  title="Ubicación Clínica Cordillera"
                  src="https://www.google.com/maps?q=Huaraz,Ancash,Peru&output=embed"
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
  readonly specialties: Spec[] = [
    { name: 'Cardiología', dot: '#ef4444', soft: 'rgba(239,68,68,.2)', text: 'Cuidado preventivo y tratamiento avanzado para la salud de tu corazón con tecnología no invasiva.' },
    { name: 'Pediatría', dot: '#3b82f6', soft: 'rgba(59,130,246,.2)', text: 'Atención especializada para el crecimiento y bienestar de los más pequeños con un trato dulce y profesional.' },
    { name: 'Fisioterapia', dot: '#14b8a6', soft: 'rgba(20,184,166,.2)', text: 'Recuperación funcional y rehabilitación física con programas personalizados para deportistas y pacientes crónicos.' },
  ];

  readonly doctors: Doc[] = [
    { name: 'Dra. Elena Martínez', spec: 'Ginecología y Obstetricia', cmp: 'CMP: 45678', rne: 'RNE: 12345', initials: 'EM' },
    { name: 'Dr. Ricardo Paz', spec: 'Cirugía General', cmp: 'CMP: 32109', rne: 'RNE: 54321', initials: 'RP' },
  ];

  readonly contacto = [
    { t: 'Ubicación', v: 'Av. Centenario 123, Huaraz<br>Ancash, Perú', icon: '📍' },
    { t: 'Teléfonos', v: '(044) 456-7890<br>+51 987 654 321', icon: '📞' },
    { t: 'Horario', v: 'Lun - Sáb: 08:00 - 20:00<br>Emergencias 24/7', icon: '⏰' },
  ];
}
