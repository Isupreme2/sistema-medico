import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PublicLayout } from '../public-layout';

@Component({
  selector: 'app-contacto',
  imports: [PublicLayout],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-public-layout>
      <section class="section section--white">
        <div class="container">
          <div style="max-width:42rem;margin-bottom:3rem">
            <span class="eyebrow">Contáctanos</span>
            <h1 class="h-page">Estamos aquí para atenderte</h1>
          </div>

          <div class="grid grid--3" style="margin-bottom:3rem">
            @for (c of cards; track c.t) {
              <div class="card card--soft">
                <div class="icon-tile">{{ c.icon }}</div>
                <h3 style="font-size:1.05rem;margin-bottom:.5rem">{{ c.t }}</h3>
                <p [innerHTML]="c.body"></p>
              </div>
            }
          </div>

          <div style="border-radius:1.5rem;overflow:hidden;border:1px solid var(--slate-100)">
            <iframe
              title="Mapa Clínica Cordillera"
              src="https://www.google.com/maps?q=Huaraz,Ancash,Peru&output=embed"
              style="width:100%;height:480px;border:0"
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </section>
    </app-public-layout>
  `,
})
export class Contacto {
  readonly cards = [
    { t: 'Ubicación', body: 'Av. Centenario 123<br>Huaraz, Ancash, Perú', icon: '📍' },
    { t: 'Teléfonos', body: '(044) 456-7890<br>+51 987 654 321', icon: '📞' },
    { t: 'Horarios', body: 'Lun - Sáb: 08:00 - 20:00<br>Emergencias 24/7', icon: '⏰' },
    { t: 'Correo', body: 'citas@clinicacordillera.pe', icon: '✉️' },
    { t: 'WhatsApp', body: '+51 987 654 321', icon: '💬' },
    { t: 'Emergencias', body: '(044) 123-456', icon: '🚨' },
  ];
}
