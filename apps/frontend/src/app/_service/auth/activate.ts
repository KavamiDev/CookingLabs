// Minimum length of a password, checked again by the API (MIN_PASSWORD_LENGTH in the backend)
export const MIN_PASSWORD_LENGTH = 12;

export type ActivateResult = { ok: true } | { ok: false; error: string };

// Sends the token of the invitation link and the chosen password (POST /api/invitations/accept)
export async function activateAccount(token: string, password: string): Promise<ActivateResult> {
  try {
    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (res.ok) {
      return { ok: true };
    }
    if (res.status === 429) {
      return { ok: false, error: "Trop de tentatives. Réessayez dans une minute." };
    }
    // 400: the API explains why (link expired, already used, password too short)
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    return { ok: false, error: message ?? "Erreur inattendue, réessayez." };
  } catch {
    return { ok: false, error: "Impossible de joindre le serveur." };
  }
}
