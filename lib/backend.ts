export const BACKEND_URL = (process.env.API_BACKEND_URL ?? "http://127.0.0.1:5000").replace(/\/$/, "");

export const SESSION_COOKIES = ["access_token"] as const;

/** Extrae el valor de una cookie de los encabezados Set-Cookie que devuelve el backend. */
export function parseSetCookie(setCookies: string[], name: string): string | null {
  for (const header of setCookies) {
    const [pair] = header.split(";");
    const index = pair.indexOf("=");
    if (index > 0 && pair.slice(0, index).trim() === name) {
      const value = pair.slice(index + 1).trim();
      return value && value !== '""' ? value : null;
    }
  }
  return null;
}
