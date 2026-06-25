import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicLayout } from '../public-layout';

@Component({
  selector: 'app-especialidades',
  imports: [PublicLayout, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-public-layout>
      <section class="section section--white">
        <div class="container">
          <div style="max-width:42rem;margin-bottom:4rem">
            <span class="eyebrow">Servicios médicos</span>
            <h1 class="h-page">Especialidades para toda la familia</h1>
            <p class="lead">
              Contamos con un equipo multidisciplinario que cubre las principales áreas de la
              medicina moderna, con foco en prevención, diagnóstico oportuno y tratamiento
              responsable.
            </p>
          </div>

          <div class="grid grid--3">
            @for (e of items; track e.name) {
              <article class="card card--soft">
                <div class="icon-tile"><span class="dot" [style.background]="e.dot"></span></div>
                <h3>{{ e.name }}</h3>
                <p style="margin-bottom:1.5rem">{{ e.desc }}</p>
                <a class="text-brand" style="font-weight:700;font-size:.88rem;text-decoration:none" routerLink="/citas">
                  Agendar consulta →
                </a>
              </article>
            }
          </div>
        </div>
      </section>
    </app-public-layout>
  `,
})
export class Especialidades {
  readonly items = [
    { name: 'Cardiología', desc: 'Diagnóstico y tratamiento de enfermedades cardiovasculares con ecocardiografía y holter.', dot: '#ef4444' },
    { name: 'Pediatría', desc: 'Control de crecimiento, vacunación y atención integral del niño y adolescente.', dot: '#3b82f6' },
    { name: 'Ginecología y Obstetricia', desc: 'Salud de la mujer, control prenatal y ecografía 4D.', dot: '#ec4899' },
    { name: 'Medicina Interna', desc: 'Atención integral del paciente adulto con enfoque clínico.', dot: '#f59e0b' },
    { name: 'Fisioterapia y Rehabilitación', desc: 'Programas personalizados para recuperación funcional.', dot: '#14b8a6' },
    { name: 'Dermatología', desc: 'Tratamientos clínicos y estéticos para el cuidado de la piel.', dot: '#f97316' },
    { name: 'Traumatología', desc: 'Atención de lesiones óseas, musculares y articulares.', dot: '#64748b' },
    { name: 'Gastroenterología', desc: 'Endoscopías diagnósticas y manejo de enfermedades digestivas.', dot: '#10b981' },
    { name: 'Neurología', desc: 'Evaluación de cefaleas, epilepsia y trastornos del sistema nervioso.', dot: '#6366f1' },
    { name: 'Oftalmología', desc: 'Salud visual integral con tecnología de evaluación avanzada.', dot: '#06b6d4' },
    { name: 'Endocrinología', desc: 'Diabetes, tiroides y manejo hormonal especializado.', dot: '#eab308' },
    { name: 'Otorrinolaringología', desc: 'Atención de oído, nariz y garganta para toda la familia.', dot: '#f43f5e' },
  ];
}
