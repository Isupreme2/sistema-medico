import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PublicLayout } from '../public-layout';

@Component({
  selector: 'app-nosotros',
  imports: [PublicLayout],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-public-layout>
      <section class="section section--white">
        <div class="container split" style="display:grid;gap:4rem;align-items:center">
          <div>
            <span class="eyebrow">Sobre nosotros</span>
            <h1 class="h-page">Una clínica nacida en Ancash, para Ancash.</h1>
            <p class="lead" style="margin-bottom:1.5rem">
              Desde 2009, la Clínica Cordillera ha acompañado a miles de familias huaracinas en su
              camino hacia una mejor salud. Combinamos infraestructura moderna, tecnología
              diagnóstica y un equipo profesional con vocación de servicio.
            </p>
            <p class="muted">
              Trabajamos con un enfoque integral: prevención, diagnóstico oportuno, tratamiento
              responsable y seguimiento personalizado.
            </p>
          </div>
          <img
            src="/assets/hero-clinic.jpg"
            alt="Instalaciones de la Clínica Cordillera"
            loading="lazy"
            style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:1.5rem;box-shadow:0 20px 40px -15px rgba(0,0,0,.25)"
          />
        </div>
      </section>

      <section class="section section--slate">
        <div class="container">
          <h2 class="h-sec" style="margin-bottom:2rem">Misión, visión y valores</h2>
          <div class="grid grid--3">
            <div class="card">
              <h3>Misión</h3>
              <p>Brindar atención médica integral y humanizada que mejore la calidad de vida de las familias de la región Ancash.</p>
            </div>
            <div class="card">
              <h3>Visión</h3>
              <p>Ser la clínica de referencia en Ancash por su calidad asistencial, tecnología y compromiso con cada paciente.</p>
            </div>
            <div class="card">
              <h3>Valores</h3>
              <ul style="margin:0;padding-left:1.1rem;color:var(--slate-600);font-size:.9rem;line-height:1.8">
                @for (v of values; track v.t) {
                  <li><strong style="color:var(--slate-900)">{{ v.t }}.</strong> {{ v.d }}</li>
                }
              </ul>
            </div>
          </div>
        </div>
      </section>
    </app-public-layout>
  `,
})
export class Nosotros {
  readonly values = [
    { t: 'Trato humano', d: 'Cada paciente es escuchado con tiempo, empatía y respeto.' },
    { t: 'Excelencia científica', d: 'Protocolos basados en evidencia y formación continua del equipo.' },
    { t: 'Accesibilidad', d: 'Convenios con principales EPS y opciones de pago flexibles.' },
  ];
}
