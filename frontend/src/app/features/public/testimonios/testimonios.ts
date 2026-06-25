import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PublicLayout } from '../public-layout';

@Component({
  selector: 'app-testimonios',
  imports: [PublicLayout],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-public-layout>
      <section class="section section--white">
        <div class="container" style="max-width:72rem">
          <div style="max-width:42rem;margin-bottom:4rem">
            <span class="eyebrow">Testimonios</span>
            <h1 class="h-page">La confianza de quienes ya nos eligieron</h1>
          </div>

          <div class="grid grid--2">
            @for (t of testimonios; track t.n) {
              <figure class="testi">
                <div class="quote">"</div>
                <blockquote>{{ t.t }}</blockquote>
                <figcaption>
                  <span class="av-sm">{{ t.n[0] }}</span>
                  <div>
                    <p style="margin:0;font-weight:700;font-size:.88rem">{{ t.n }}</p>
                    <p style="margin:0;font-size:.75rem;color:var(--slate-500)">{{ t.c }}, Ancash</p>
                  </div>
                </figcaption>
              </figure>
            }
          </div>

          <p style="margin-top:3rem;font-size:.75rem;color:var(--slate-400);text-align:center;max-width:36rem;margin-left:auto;margin-right:auto">
            Los testimonios se publican con consentimiento de los pacientes y no constituyen
            promesa de resultados médicos.
          </p>
        </div>
      </section>
    </app-public-layout>
  `,
})
export class Testimonios {
  readonly testimonios = [
    { n: 'María L.', c: 'Huaraz', t: 'El trato del personal fue excepcional. Me sentí escuchada en todo momento y el diagnóstico fue muy claro.' },
    { n: 'Jorge P.', c: 'Carhuaz', t: 'Reservé por WhatsApp y al día siguiente ya tenía cita con el cardiólogo. Súper rápido y profesional.' },
    { n: 'Ana R.', c: 'Yungay', t: 'Llevé a mi hijo de 4 años y el pediatra fue maravilloso con él. Volveremos sin duda.' },
    { n: 'Carlos M.', c: 'Huaraz', t: 'Buen equipamiento, instalaciones limpias y modernas. Se nota la inversión en tecnología.' },
  ];
}
