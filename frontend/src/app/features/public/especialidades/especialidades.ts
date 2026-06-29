import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicLayout } from '../public-layout';
import { SpecialtyService } from '../../../core/services/specialty.service';

interface EspItem {
  name: string;
  desc: string;
  dot: string;
}

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

          @if (loading()) {
            <p class="muted">Cargando especialidades…</p>
          } @else if (visibles().length === 0) {
            <div class="card card--soft" style="max-width:42rem">
              <h3>Estamos incorporando especialistas</h3>
              <p style="margin-bottom:1.5rem">
                En este momento estamos sumando médicos a nuestro equipo. Escríbenos y te avisamos
                en cuanto haya disponibilidad en el área que necesitas.
              </p>
              <a class="text-brand" style="font-weight:700;font-size:.88rem;text-decoration:none" routerLink="/contacto">
                Contáctanos →
              </a>
            </div>
          } @else {
            <div class="grid grid--3">
              @for (e of visibles(); track e.name) {
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
          }
        </div>
      </section>
    </app-public-layout>
  `,
})
export class Especialidades {
  private specialties = inject(SpecialtyService);

  readonly loading = signal(true);
  /** Especialidades con al menos un médico activo (vienen del backend). */
  private readonly ofertadas = signal<string[]>([]);

  /** Catálogo curado: descripción y color por especialidad (solo presentación). */
  private readonly catalogo: Record<string, { desc: string; dot: string }> = {
    'Cardiología': { desc: 'Diagnóstico y tratamiento de enfermedades cardiovasculares con ecocardiografía y holter.', dot: '#ef4444' },
    'Pediatría': { desc: 'Control de crecimiento, vacunación y atención integral del niño y adolescente.', dot: '#3b82f6' },
    'Ginecología y Obstetricia': { desc: 'Salud de la mujer, control prenatal y ecografía 4D.', dot: '#ec4899' },
    'Medicina Interna': { desc: 'Atención integral del paciente adulto con enfoque clínico.', dot: '#f59e0b' },
    'Fisioterapia y Rehabilitación': { desc: 'Programas personalizados para recuperación funcional.', dot: '#14b8a6' },
    'Dermatología': { desc: 'Tratamientos clínicos y estéticos para el cuidado de la piel.', dot: '#f97316' },
    'Traumatología': { desc: 'Atención de lesiones óseas, musculares y articulares.', dot: '#64748b' },
    'Gastroenterología': { desc: 'Endoscopías diagnósticas y manejo de enfermedades digestivas.', dot: '#10b981' },
    'Neurología': { desc: 'Evaluación de cefaleas, epilepsia y trastornos del sistema nervioso.', dot: '#6366f1' },
    'Oftalmología': { desc: 'Salud visual integral con tecnología de evaluación avanzada.', dot: '#06b6d4' },
    'Endocrinología': { desc: 'Diabetes, tiroides y manejo hormonal especializado.', dot: '#eab308' },
    'Otorrinolaringología': { desc: 'Atención de oído, nariz y garganta para toda la familia.', dot: '#f43f5e' },
  };

  /** Solo las especialidades ofertadas; usa la ficha curada o un texto genérico. */
  readonly visibles = computed<EspItem[]>(() =>
    this.ofertadas().map((name) => {
      const ficha = this.catalogo[name];
      return {
        name,
        desc: ficha?.desc ?? 'Atención médica especializada con profesionales colegiados.',
        dot: ficha?.dot ?? '#0d9488',
      };
    }),
  );

  constructor() {
    this.specialties.conMedicos().subscribe({
      next: (nombres) => {
        this.ofertadas.set(nombres);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
