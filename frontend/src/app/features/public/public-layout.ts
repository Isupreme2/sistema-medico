import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';

/**
 * Envoltura del sitio público: header + contenido proyectado + footer.
 * Cada página de marketing se envuelve con <app-public-layout>…</app-public-layout>.
 */
@Component({
  selector: 'app-public-layout',
  imports: [SiteHeader, SiteFooter],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="site">
      <app-site-header />
      <main class="site-main">
        <ng-content />
      </main>
      <app-site-footer />
    </div>
  `,
})
export class PublicLayout {}
