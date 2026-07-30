// Só emails cadastrados em AUTH_ALLOWED_EMAILS podem logar — não há
// cadastro aberto nem convite, a lista é o único controle de acesso.

export function isEmailAllowed(email: string): boolean {
  const allowed = (process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.trim().toLowerCase());
}
