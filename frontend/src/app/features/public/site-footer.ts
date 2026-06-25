import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Pie del sitio público. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="about">
            <a routerLink="/" class="brand-logo" style="margin-bottom:1.5rem">
              <span class="mark"><span class="mark__inner"></span></span>
              <span class="brand-name">Clínica Cordillera</span>
            </a>
            <p>
              Comprometidos con la salud de la región Ancash, brindando excelencia médica y
              trato humano desde hace más de 15 años.
            </p>
          </div>

          <div>
            <h4>Navegación</h4>
            <ul>
              <li><a routerLink="/">Inicio</a></li>
              <li><a routerLink="/nosotros">Sobre la Clínica</a></li>
              <li><a routerLink="/equipo">Staff Médico</a></li>
              <li><a routerLink="/especialidades">Especialidades</a></li>
              <li><a routerLink="/testimonios">Testimonios</a></li>
            </ul>
          </div>

          <div>
            <h4>Recursos</h4>
            <ul>
              <li><a routerLink="/faq">Preguntas Frecuentes</a></li>
              <li><a routerLink="/blog">Blog de Salud</a></li>
              <li><a routerLink="/citas">Reservar Cita</a></li>
              <li><a routerLink="/contacto">Contacto</a></li>
            </ul>
          </div>

          <div>
            <h4>Contacto</h4>
            <ul>
              <li>Av. Centenario 123, Huaraz</li>
              <li>Ancash, Perú</li>
              <li>(044) 456-7890</li>
              <li>citas&#64;clinicacordillera.pe</li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <p class="copy">© {{ year }} Clínica Cordillera Ancash. Todos los derechos reservados.</p>
          <div class="legal">
            <a href="#">Política de Privacidad</a>
            <a href="#">Términos de Uso</a>
            <a href="#">Libro de Reclamaciones</a>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  readonly year = new Date().getFullYear();
}
