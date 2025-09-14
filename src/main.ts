//main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

// Debug temporal
console.log('=== DEBUG ENVIRONMENT ===');
console.log('Environment en uso:', environment);
console.log('API URL:', environment.apiUrl);
console.log('Production?', environment.production);
console.log('=========================');
bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
