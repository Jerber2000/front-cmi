// Usado por: ng build --configuration production
export const environment = {
  production: true,
  apiUrl: '/api',  // 🔹 Si backend está en mismo servidor, usar '/api'
                   // 🔹 Si backend está en otro dominio, usar: 'https://tudominio.com/api'
  appName: 'CMI - Producción',
  enableLogging: false
};
