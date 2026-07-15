# Keystone HTML Drop-in Example

This folder shows how to add Keystone authentication to a plain HTML project with one script tag.

## What it demonstrates

- Password login
- Password registration
- Google OAuth sign-in
- Session check
- Logout

## Prerequisites

Auth endpoints (`/auth/*`, `/sdk/*`, `/auth/oauth/*`) are only available after Keystone setup is complete. Make sure you have:

1. Finished the setup wizard at `http://localhost:5173`.
2. A `.keystone-setup-complete` marker file in the project root.
3. Restarted Keystone in normal mode (not setup mode).

## Run it

1. Start Keystone in normal/production mode:
   ```bash
   ./start.sh --production
   ```

2. Serve this folder from a local web server (not `file://`):
   ```bash
   cd examples/html-dropin
   npx serve .
   # or
   python3 -m http.server 5500
   ```

3. Open the URL it prints, usually `http://localhost:3000` or `http://localhost:5500`.

4. The first page load calls `Keystone.connect("my-html-project", ...)` which automatically registers your project origin with Keystone so CORS and OAuth work.

5. Sign up, sign in, or use Google.

## How it works

The page loads the SDK from Keystone:

```html
<script src="http://localhost:4001/sdk/keystone-dropin.js"
        data-keystone-url="http://localhost:4001"
        data-keystone-autowire="true"></script>
```

With `data-keystone-autowire="true"`, the SDK automatically attaches to forms and buttons with these IDs or data attributes:

- Login form: `id="keystone-login-form"` or `data-keystone-form="login"`
- Register form: `id="keystone-register-form"` or `data-keystone-form="register"`
- Google button: `id="keystone-google-btn"` or `data-keystone-google`
- Logout button: `id="keystone-logout"` or `data-keystone-logout`
- Inputs: `data-keystone-input="email"`, `"password"`, `"username"`, `"name"`

You can also call the SDK manually:

```js
await Keystone.connect("my-project", "http://localhost:5500/callback.html");
const user = await Keystone.getUser();
await Keystone.login(email, password);
await Keystone.register(username, email, password, name);
Keystone.loginWithGoogle();
await Keystone.logout();
```

## Important notes

- **Do not open `index.html` directly from the file system.** Browsers send `Origin: null` for `file://` URLs, which makes cookie-based sessions unreliable. Always serve it from `http://localhost:PORT`.
- The `Keystone.connect()` endpoint creates a public application entry in Keystone. In production you should create applications from the Keystone admin dashboard instead.
- For Google OAuth to work, you must configure Google client credentials in Keystone (Dashboard → Identity Providers → Google) and add `http://localhost:4001/auth/callback/google` as an authorized redirect URI in Google Cloud Console.
- If you see `CORS header missing` or `500` errors on `/auth/register`, Keystone is probably still in setup mode. Finish setup and restart with `./start.sh --production`.
