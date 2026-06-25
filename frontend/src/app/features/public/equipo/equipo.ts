import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PublicLayout } from '../public-layout';

@Component({
  selector: 'app-equipo',
  imports: [PublicLayout],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-public-layout>
      <section class="section section--slate">
        <div class="container">
          <div style="max-width:42rem;margin-bottom:4rem">
            <span class="eyebrow">Staff médico</span>
            <h1 class="h-page">Profesionales que cuidan de ti</h1>
            <p class="lead">
              Cada uno de nuestros médicos cuenta con su colegiatura vigente en el CMP y registro
              de especialista (RNE), respaldando la calidad de la atención.
            </p>
          </div>

          <div class="grid grid--3">
            @for (d of doctors; track d.name) {
              <article class="doc-card">
                <div class="av-xl">{{ d.initials }}</div>
                <h2 style="font-size:1.25rem;font-weight:700;margin:0">{{ d.name }}</h2>
                <p class="text-brand" style="font-size:.88rem;font-weight:600;margin:.25rem 0 1rem">{{ d.spec }}</p>
                <dl>
                  <div><dt>CMP</dt><dd class="mono">{{ d.cmp }}</dd></div>
                  <div><dt>RNE</dt><dd class="mono">{{ d.rne }}</dd></div>
                  <div><dt>Formación</dt><dd>{{ d.uni }}</dd></div>
                  <div><dt>Experiencia</dt><dd>{{ d.years }}</dd></div>
                </dl>
              </article>
            }
          </div>
        </div>
      </section>
    </app-public-layout>
  `,
})
export class Equipo {
  readonly doctors = [
    { name: 'Dra. Elena Martínez', spec: 'Ginecología y Obstetricia', cmp: '45678', rne: '12345', uni: 'UNMSM', years: '15 años', initials: 'EM' },
    { name: 'Dr. Ricardo Paz', spec: 'Cirugía General', cmp: '32109', rne: '54321', uni: 'UPCH', years: '20 años', initials: 'RP' },
    { name: 'Dr. Carlos Mendoza', spec: 'Cardiología Intervencionista', cmp: '45892', rne: '23145', uni: 'UNMSM', years: '18 años', initials: 'CM' },
    { name: 'Dra. Sofía Luna', spec: 'Dermatología', cmp: '61004', rne: '31002', uni: 'UPCH', years: '8 años', initials: 'SL' },
    { name: 'Dr. Juan Paredes', spec: 'Gastroenterología', cmp: '39112', rne: '19887', uni: 'UNT', years: '22 años', initials: 'JP' },
    { name: 'Dra. Ana Quispe', spec: 'Pediatría', cmp: '52311', rne: '27654', uni: 'UNMSM', years: '12 años', initials: 'AQ' },
  ];
}
