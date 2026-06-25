import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/** Cabecera del sitio público (sticky, con blur). */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <header class="site-header">
      <div class="container site-header__inner">
        <a routerLink="/" class="brand-logo">
          <span class="mark"><span class="mark__inner"></span></span>
          <span class="brand-name">Clínica Cordillera</span>
        </a>

        <nav class="site-nav">
          <a routerLink="/especialidades" routerLinkActive="active">Especialidades</a>
          <a routerLink="/equipo" routerLinkActive="active">Equipo Médico</a>
          <a routerLink="/nosotros" routerLinkActive="active">Sobre Nosotros</a>
          <a routerLink="/blog" routerLinkActive="active">Blog</a>
          <a routerLink="/contacto" routerLinkActive="active">Contacto</a>
        </nav>

        <div class="header-actions">
          <a class="tel" href="tel:+51932101485">Emergencias: +51 932 101 485</a>
          @if (autenticado()) {
            <a class="link-login" routerLink="/dashboard">Mi panel</a>
          } @else {
            <a class="link-login" routerLink="/login">Ingresar</a>
          }
          <a class="pill" routerLink="/citas">Reservar Cita</a>
        </div>
      </div>
    </header>
  `,
})
export class SiteHeader {
  private auth = inject(AuthService);
  readonly autenticado = computed(() => this.auth.isAuthenticated());
}
