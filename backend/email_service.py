import base64
import hmac
import hashlib
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)

EMAIL_FROM     = os.getenv("EMAIL_FROM", "")
EMAIL_PASSWORD = os.getenv("EMAIL_APP_PASSWORD", "")
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL", "guaniqued@gmail.com")
APP_BASE_URL   = os.getenv("APP_BASE_URL", "http://localhost:8000")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://localhost:3000")
_SECRET        = os.getenv("JWT_SECRET", "change-me-in-production")


# ── Token firmado con HMAC ────────────────────────────────────────────────────

def make_activation_token(user_id: str) -> str:
    sig = hmac.new(_SECRET.encode(), user_id.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{user_id}:{sig}".encode()).decode()


def verify_activation_token(token: str) -> Optional[str]:
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        user_id, sig = decoded.rsplit(":", 1)
        expected = hmac.new(_SECRET.encode(), user_id.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expected):
            return user_id
        return None
    except Exception:
        return None


# ── Envío de email ────────────────────────────────────────────────────────────

def _send(subject: str, html: str, to: str = ADMIN_EMAIL) -> bool:
    if not EMAIL_FROM or not EMAIL_PASSWORD:
        logger.warning("Email no configurado (EMAIL_FROM / EMAIL_APP_PASSWORD vacíos). Saltando envío.")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"NutriTrack IA <{EMAIL_FROM}>"
        msg["To"]      = to
        msg.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
            server.login(EMAIL_FROM, EMAIL_PASSWORD)
            server.sendmail(EMAIL_FROM, to, msg.as_string())
        logger.info("Email enviado a %s — %s", to, subject)
        return True
    except Exception as exc:
        logger.error("Error enviando email: %s", exc)
        return False


def send_new_user_notification(user_id: str, user_email: str, user_name: str) -> bool:
    """Notifica al admin de un nuevo registro y provee el link de activación."""
    token       = make_activation_token(user_id)
    activate_url = f"{APP_BASE_URL}/admin/activate/{token}"

    html = f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#16a34a,#059669);padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;">🌿 NutriTrack IA</h1>
      <p style="margin:6px 0 0;color:#bbf7d0;font-size:14px;">Panel de administración</p>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">Nuevo usuario registrado</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">
        Un nuevo usuario se ha registrado y está esperando tu aprobación para poder acceder a la app.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px 0 0 0;font-weight:600;color:#374151;font-size:13px;width:110px;">Nombre</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#111827;font-size:14px;">{user_name}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:13px;">Email</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#111827;font-size:14px;">{user_email}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:0 0 0 8px;font-weight:600;color:#374151;font-size:13px;">ID</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;font-size:11px;font-family:monospace;">{user_id}</td>
        </tr>
      </table>

      <a href="{activate_url}"
         style="display:inline-block;background:#16a34a;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.3px;">
        ✅ Activar usuario
      </a>

      <p style="color:#9ca3af;font-size:12px;margin-top:20px;word-break:break-all;">
        Si el botón no funciona, copia este enlace:<br>
        <a href="{activate_url}" style="color:#16a34a;">{activate_url}</a>
      </p>
    </div>

    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">NutriTrack IA · Este correo fue generado automáticamente</p>
    </div>
  </div>
</body>
</html>
"""
    return _send(f"[NutriTrack IA] Nuevo usuario: {user_name} ({user_email})", html)


def send_account_activated_email(user_email: str, user_name: str) -> bool:
    """Notifica al usuario que su cuenta fue activada e incluye link de acceso."""
    login_url = f"{FRONTEND_URL}/login"
    html = f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#16a34a,#059669);padding:32px;text-align:center;">
      <div style="font-size:52px;margin-bottom:10px;">🎉</div>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">¡Tu cuenta está activa!</h1>
      <p style="margin:6px 0 0;color:#bbf7d0;font-size:14px;">NutriTrack IA</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;text-align:center;">
      <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hola, <strong>{user_name}</strong> 👋</p>
      <p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 28px;">
        Tu cuenta ha sido <strong style="color:#16a34a;">aprobada por el administrador</strong>.<br>
        Ya puedes iniciar sesión y comenzar tu seguimiento nutricional personalizado con inteligencia artificial.
      </p>

      <a href="{login_url}"
         style="display:inline-block;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:.3px;box-shadow:0 4px 12px rgba(22,163,74,.3);">
        🚀 Iniciar sesión en NutriTrack IA
      </a>

      <p style="color:#9ca3af;font-size:12px;margin-top:20px;">
        Si el botón no funciona, copia este enlace:<br>
        <a href="{login_url}" style="color:#16a34a;">{login_url}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
        NutriTrack IA · Este correo fue generado automáticamente
      </p>
    </div>
  </div>
</body>
</html>
"""
    return _send("¡Tu cuenta en NutriTrack IA ha sido activada! 🎉", html, to=user_email)
