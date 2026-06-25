import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PublicLayout } from '../public-layout';

@Component({
  selector: 'app-faq',
  imports: [PublicLayout],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-public-layout>
      <section class="section section--white">
        <div class="container" style="max-width:56rem">
          <div style="margin-bottom:3rem">
            <span class="eyebrow">FAQ</span>
            <h1 class="h-page" style="margin-bottom:0">Preguntas frecuentes</h1>
          </div>

          <div style="display:flex;flex-direction:column;gap:1rem">
            @for (f of faqs; track f.q) {
              <details class="faq-item">
                <summary>{{ f.q }}<span class="plus">+</span></summary>
                <p>{{ f.a }}</p>
              </details>
            }
          </div>
        </div>
      </section>
    </app-public-layout>
  `,
})
export class Faq {
  readonly faqs = [
    { q: '¿Cómo agendo mi primera cita?', a: 'Puedes reservar en línea desde nuestra sección Citas, por WhatsApp o llamando a (044) 456-7890. Te confirmamos disponibilidad en menos de 24 horas hábiles.' },
    { q: '¿Qué seguros y EPS aceptan?', a: 'Trabajamos con Rímac, Pacífico, Mapfre, La Positiva y SaludPol, además de atención particular. Las autorizaciones se gestionan directamente en la clínica.' },
    { q: '¿Qué formas de pago tienen?', a: 'Aceptamos efectivo, tarjetas Visa, Mastercard, American Express, Yape, Plin y transferencias bancarias.' },
    { q: '¿Puedo reprogramar o cancelar mi cita?', a: 'Sí, hasta 24 horas antes sin costo. Comunícate por WhatsApp o por teléfono y nuestro equipo te ayudará.' },
    { q: '¿Cómo recibo los resultados de mis exámenes?', a: 'Puedes recogerlos en la clínica, recibirlos por correo electrónico o, en muchos casos, descargarlos desde nuestra plataforma del paciente.' },
    { q: '¿Atienden emergencias?', a: 'Sí, contamos con servicio de emergencias 24/7. Llama al (044) 123-456.' },
  ];
}
