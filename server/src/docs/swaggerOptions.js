// Settings for Swagger UI. The functions run in the browser, so they may only
// use what exists there (swagger-ui-express copies their source to the page).

// After a login, Google login or refresh, puts the new access token into
// Authorize, so the protected routes work without pasting it. Logging out
// removes it.
function saveToken(response) {
  const path = new URL(response.url, window.location.href).pathname;
  if (response.ok && ['/api/auth/login', '/api/auth/google', '/api/auth/refresh'].includes(path)) {
    window.ui.preauthorizeApiKey('bearerAuth', response.body.accessToken);
  }
  if (response.ok && path === '/api/auth/logout') {
    window.ui.authActions.logout(['bearerAuth']);
  }
  return response;
}

const swaggerOptions = { responseInterceptor: saveToken };

module.exports = { swaggerOptions, saveToken };
