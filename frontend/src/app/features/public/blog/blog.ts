import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PublicLayout } from '../public-layout';

@Component({
  selector: 'app-blog',
  imports: [PublicLayout],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-public-layout>
      <section class="section section--slate">
        <div class="container">
          <div style="max-width:42rem;margin-bottom:4rem">
            <span class="eyebrow">Blog</span>
            <h1 class="h-page">Salud, prevención y bienestar</h1>
            <p class="lead">
              Información médica clara y responsable elaborada por nuestro equipo de especialistas.
              Recuerda que el contenido es educativo y no reemplaza una consulta médica.
            </p>
          </div>

          <div class="grid grid--3">
            @for (p of posts; track p.t) {
              <article class="post-card">
                <div class="thumb">{{ p.c[0] }}</div>
                <div class="body">
                  <span class="eyebrow">{{ p.c }}</span>
                  <h2 style="font-size:1.1rem;font-weight:700;margin:.5rem 0;line-height:1.35">{{ p.t }}</h2>
                  <p style="margin:0;font-size:.88rem;color:var(--slate-600)">{{ p.d }}</p>
                </div>
              </article>
            }
          </div>
        </div>
      </section>
    </app-public-layout>
  `,
})
export class Blog {
  readonly posts = [
    { t: 'Cómo prevenir el mal de altura en Huaraz', c: 'Prevención', d: 'Consejos prácticos para visitantes y residentes de zonas de altura.' },
    { t: 'Control prenatal: la importancia del primer trimestre', c: 'Ginecología', d: 'Lo que toda gestante debe saber en sus primeras semanas.' },
    { t: 'Hipertensión: el enemigo silencioso', c: 'Cardiología', d: 'Cómo detectarla a tiempo y mantener tu corazón sano.' },
    { t: 'Vacunación infantil: calendario actualizado', c: 'Pediatría', d: 'Revisa qué vacunas necesita tu hijo según su edad.' },
    { t: 'Recuperación post lesión deportiva', c: 'Fisioterapia', d: 'Etapas y recomendaciones para volver a tu actividad.' },
    { t: 'Cuidado de la piel en clima andino', c: 'Dermatología', d: 'Protección solar y rutina diaria en alta montaña.' },
  ];
}
