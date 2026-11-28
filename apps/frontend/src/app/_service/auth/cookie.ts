// Name of the session cookie set by the API on login (same as AUTH_COOKIE in the backend)
export const AUTH_COOKIE = "access_token";

// Page where a visitor without a session is sent
export const LOGIN_PAGE = "/connexion";

// Page where an invited student chooses a first password (link of the invitation e-mail)
export const ACTIVATION_PAGE = "/activation";

// Pages a visitor without a session can open
export const PUBLIC_PAGES = [LOGIN_PAGE, ACTIVATION_PAGE];
