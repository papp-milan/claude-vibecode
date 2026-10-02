import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MARKDOWN_CSS } from '../../constants/markdown-styles';
import { renderMarkdown } from '../../utils/markdown';

/**
 * Zeigt Markdown an. Das HTML wird vorher mit DOMPurify bereinigt, deshalb ist
 * `bypassSecurityTrustHtml` hier unbedenklich (Angulars eigener Sanitizer würde
 * z. B. die Checkboxen von Checklisten entfernen).
 * ViewEncapsulation.None, damit dieselben Styles auch im Export verwendet werden können.
 */
@Component({
  selector: 'app-markdown-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'sbx-md-host' },
  styles: [MARKDOWN_CSS, '.sbx-md-host{display:block}'],
  template: `<div class="sbx-md" [innerHTML]="html()"></div>`,
})
export class MarkdownViewComponent {
  readonly source = input.required<string>();

  private readonly sanitizer = inject(DomSanitizer);

  protected readonly html = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(this.source())),
  );
}
