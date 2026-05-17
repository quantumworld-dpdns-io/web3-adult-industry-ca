import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

_SECRET_KEY = os.getenv("CA_API_SECRET_KEY", "change-me-in-production-please")
_ALGORITHM = "HS256"
_ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_scheme = HTTPBearer(auto_error=False)

_API_KEYS: dict[str, dict[str, Any]] = {}
_ADMIN_USERS: dict[str, dict[str, Any]] = {}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _SECRET_KEY, algorithm=_ALGORITHM)


async def get_api_key(request: Request) -> str:
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        api_key = request.query_params.get("api_key")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Provide via X-API-Key header or api_key query parameter.",
        )
    if api_key not in _API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key.",
        )
    return api_key


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a Bearer token.",
        )
    try:
        payload = jwt.decode(credentials.credentials, _SECRET_KEY, algorithms=[_ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role", "admin")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )
        return {"username": username, "role": role}
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        )


async def require_admin(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if current_user.get("role") not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


def register_api_key(key: str, label: str = "default") -> str:
    _API_KEYS[key] = {"label": label, "created_at": datetime.now(timezone.utc).isoformat()}
    return key


def list_api_keys() -> dict[str, dict[str, Any]]:
    return dict(_API_KEYS)


def revoke_api_key(key: str) -> bool:
    return _API_KEYS.pop(key, None) is not None


def create_admin_user(username: str, password: str, role: str = "admin") -> dict[str, Any]:
    user_id = str(__import__("uuid").uuid4())
    user_record = {
        "id": user_id,
        "username": username,
        "password": hash_password(password),
        "role": role,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _ADMIN_USERS[username] = user_record
    return {
        "id": user_id,
        "username": username,
        "role": role,
        "created_at": user_record["created_at"],
    }


def list_admin_users() -> list[dict[str, Any]]:
    return [
        {"id": u["id"], "username": u["username"], "role": u["role"], "created_at": u["created_at"]}
        for u in _ADMIN_USERS.values()
    ]


def delete_admin_user(user_id: str) -> bool:
    for username, record in list(_ADMIN_USERS.items()):
        if record["id"] == user_id:
            del _ADMIN_USERS[username]
            return True
    return False


def authenticate_admin(username: str, password: str) -> Optional[str]:
    user = _ADMIN_USERS.get(username)
    if not user:
        return None
    if not verify_password(password, user["password"]):
        return None
    return create_access_token({"sub": username, "role": user["role"]})
