import { ApiError } from "./api";

export function gateChallengeErrorKey(err: unknown): string {
  if (!(err instanceof ApiError)) return "invalid";

  const key = err.body.message_key;
  if (key === "platform.gate_not_configured") return "notConfigured";
  if (key === "platform.gate_locked" || err.body.code === "AUTH_RATE_LIMITED") return "locked";
  if (key === "auth.session_expired" || err.body.code === "AUTH_SESSION_EXPIRED") return "sessionExpired";
  if (key === "platform.forbidden" || key === "auth.wrong_portal" || key === "auth.forbidden") {
    return "forbidden";
  }
  if (key === "platform.gate_invalid") return "invalid";
  return "invalid";
}
