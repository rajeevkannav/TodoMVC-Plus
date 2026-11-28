import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { applyTheme, loadTheme } from './app/storage';

// Apply the persisted theme before the first render to avoid a flash of the wrong theme.
applyTheme(loadTheme());

bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
}).catch((err: unknown) => console.error(err));
