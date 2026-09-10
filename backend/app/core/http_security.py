from __future__ import annotations

from fastapi import Request
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.sessions import csrf_is_valid


class BrowserSecurityMiddleware:
    """Validate unsafe requests before parsing uploads; add headers even on errors."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        request = Request(scope)

        async def secure_send(message):
            if message["type"] == "http.response.start":
                headers = [(k, v) for k, v in message.get("headers", [])
                           if k.lower() not in {b"cache-control", b"pragma"}]
                headers.extend([(b"cache-control", b"no-store"), (b"pragma", b"no-cache"),
                                (b"x-content-type-options", b"nosniff")])
                session = scope.get("state", {}).get("auth_session_headers")
                if session is not None:
                    headers.extend([(b"x-session-id", session[0].encode()),
                                    (b"x-session-expires-at", session[1].encode())])
                message = {**message, "headers": headers}
            await send(message)

        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            if request.headers.get("origin") not in settings.cors_origin_list or not csrf_is_valid(request):
                response = JSONResponse(status_code=403, content={"detail": "CSRF-controle mislukt. Meld opnieuw aan.", "code": "csrf_failed"})
                return await response(scope, receive, secure_send)
        await self.app(scope, receive, secure_send)
