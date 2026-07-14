async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issues = (body as any)?.issues?.map((i: any) => i.message).join(" · ");
    throw new Error(issues || (body as any)?.error || "Error de red.");
  }
  return body as T;
}

export const api = {
  get: <T,>(u: string) => req<T>(u),
  post: <T,>(u: string, b: unknown) => req<T>(u, { method: "POST", body: JSON.stringify(b) }),
  put: <T,>(u: string, b: unknown) => req<T>(u, { method: "PUT", body: JSON.stringify(b) }),
  patch: <T,>(u: string, b: unknown) => req<T>(u, { method: "PATCH", body: JSON.stringify(b) }),
  del: <T,>(u: string) => req<T>(u, { method: "DELETE" }),
};
