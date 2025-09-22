# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Admin Dashboard

The application ships with a passwordless Admin Dashboard that is guarded by a simple token-based flow.

### Routes overview

- `/admin/login` renders the login form where operators submit the administrator token.
- `/admin` and every nested admin route are wrapped by the `AdminProtectedRoute` component. When a visitor is not authenticated, they are redirected back to `/admin/login` and the originally requested URL is preserved so it can be resumed after a successful login.

### Authentication token management

- The dashboard expects a token that defaults to `admin`. The expected value is resolved at runtime via `import.meta.env.VITE_ADMIN_TOKEN`; if the environment variable is missing or empty, the fallback `admin` token is used instead.
- For production deployments, set a strong token through the `VITE_ADMIN_TOKEN` environment variable before building or starting the server. With Vite you can define it in a `.env.production` file, export it inline (e.g., `VITE_ADMIN_TOKEN="your-long-token" npm run build`), or configure it in your hosting provider's dashboard.
- Successful authentication stores the token in `sessionStorage` under the `admin-dashboard-token` key for the lifetime of the browser tab. Clearing the storage (or logging out from the UI) forces the next visit to re-enter the token, which is a good operational hygiene practice.

### Operator setup workflow

1. Install dependencies if you have not already (`npm install`).
2. Launch the development server with `npm run dev` (or `npm run build && npm run preview` when validating a production bundle).
3. Open your browser at the URL printed by Vite (typically `http://localhost:5173`) and navigate directly to `/admin/login`.
4. Provide the administrator token:
   - Use the default `admin` token for local testing.
   - Use the value configured via `VITE_ADMIN_TOKEN` in staging/production environments.
5. Submit the form to be redirected to `/admin`, where the protected dashboard features become available.
6. When the session ends or the token changes, repeat the process to re-authenticate.
