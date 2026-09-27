import { Component, signal, effect } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss'
})
export class ThemeToggleComponent {
  darkMode = signal(true);

  constructor() {
    effect(() => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark-theme', this.darkMode());
      }
    });
  }

  toggle() {
    this.darkMode.update(v => !v);
  }
}
