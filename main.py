"""Play2Study FastAPI application (merged, cleaned).

This file was updated to resolve merge conflicts. It keeps the following behaviors:
- DATABASE_URL read from env (fallback to local sqlite)
- UTF-8 response middleware
- lazy email sending using fastapi-mail when available; no hardcoded credentials
- Celery task invocation fallback to background task
- leaderboard caching via cache abstraction (if available)
"""

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, event
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import random
import string
import logging
import os
import time
from typing import Callable

from cache import get_cache
cache = get_cache()

# Email sending is optional for tests. We'll import fastapi-mail lazily inside send_email_async
conf = None

SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-key-2026-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

app = FastAPI(title="Play2Study API v2")


@app.middleware("http")
async def ensure_utf8_charset(request, call_next):
    """Ensure responses include 'charset=utf-8' in Content-Type to prevent encoding mojibake."""
    response = await call_next(request)
    ct = response.headers.get("content-type")
    if ct:
        if "charset" not in ct.lower():
            # append charset where missing
            response.headers["content-type"] = f"{ct}; charset=utf-8"
    else:
        response.headers["content-type"] = "application/json; charset=utf-8"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)


# --- DATABASE ---
# Allow overriding DATABASE_URL for tests and deployments
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./play2study.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Slow query logging (best-effort) ---
SLOW_QUERY_THRESHOLD_MS = int(os.environ.get("SLOW_QUERY_THRESHOLD_MS", "200"))
ENABLE_SLOW_QUERY_EXPLAIN = os.environ.get("SLOW_QUERY_EXPLAIN", "0") == "1"

def _register_slow_query_listeners(engine):
    @event.listens_for(engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        context._query_start_time = time.time()

    @event.listens_for(engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        try:
            duration_ms = (time.time() - getattr(context, '_query_start_time', time.time())) * 1000
            if duration_ms >= SLOW_QUERY_THRESHOLD_MS:
                logging.warning(f"SLOW QUERY {duration_ms:.1f}ms: {statement} params={parameters}")
                # Optionally run EXPLAIN ANALYZE for Postgres (best-effort)
                if ENABLE_SLOW_QUERY_EXPLAIN:
                    try:
                        # Only do explain on PG-like connections
                        conn.exec_driver_sql("SET statement_timeout = 0")
                        res = conn.execute("EXPLAIN ANALYZE " + statement)
                        logging.warning("EXPLAIN ANALYZE:\n" + "\n".join([str(r[0]) for r in res]))
                    except Exception as e:
                        logging.debug(f"Explain analyze failed: {e}")
        except Exception:
            pass


_register_slow_query_listeners(engine)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)


class UserStats(Base):
    __tablename__ = "user_stats"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    level = Column(Integer, default=1)
    points = Column(Integer, default=0)
    gems = Column(Integer, default=0)  # Игровая валюта
    streak_days = Column(Integer, default=0)
    completed_tasks = Column(Integer, default=0)


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String)
    description = Column(String)
    difficulty = Column(String)
    points = Column(Integer)
    task_type = Column(String, default="main")  # 'daily' или 'main'
    completed = Column(Boolean, default=False)


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- SCHEMAS ---
class AuthRequest(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
    register: bool


class TaskComplete(BaseModel):
    task_id: int


class BuyItemRequest(BaseModel):
    item_id: str
    cost: int


# --- UTILITIES ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401)
    except JWTError:
        raise HTTPException(status_code=401, detail="Недействительный токен")
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401)
    return user


async def send_email_async(email: str, subject: str, body: str):
    """Send email asynchronously if fastapi-mail is available. Otherwise, no-op (useful for tests).

    The import is done lazily so tests that don't need email sending won't fail due to missing deps or config.
    """
    try:
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
    except Exception:
        # fastapi-mail not available or misconfigured in this environment (tests). Skip sending.
        print("fastapi-mail not available; skipping email send in this environment")
        return

    # Build a minimal ConnectionConfig from conf if present, else try default env-backed config
    cfg = None
    try:
        if conf is not None:
            cfg = conf
        else:
            cfg = ConnectionConfig(
                MAIL_USERNAME=os.environ.get("MAIL_USERNAME", ""),
                MAIL_PASSWORD=os.environ.get("MAIL_PASSWORD", ""),
                MAIL_FROM=os.environ.get("MAIL_FROM", "no-reply@example.com"),
                MAIL_PORT=int(os.environ.get("MAIL_PORT", 587)),
                MAIL_SERVER=os.environ.get("MAIL_SERVER", "localhost"),
                MAIL_STARTTLS=bool(os.environ.get("MAIL_STARTTLS", True)),
                MAIL_SSL_TLS=bool(os.environ.get("MAIL_SSL_TLS", False)),
                USE_CREDENTIALS=True,
                VALIDATE_CERTS=False,
            )
    except Exception as e:
        print(f"Failed to configure email client: {e}")
        return

    try:
        message = MessageSchema(subject=subject, recipients=[email], body=body, subtype=MessageType.plain)
        fm = FastMail(cfg)
        await fm.send_message(message)
    except Exception as e:
        print(f"Ошибка отправки письма: {e}")


def get_rank_name(level: int) -> str:
    if level < 5:
        return "Бронзовая Лига"
    if level < 10:
        return "Серебряная Лига"
    if level < 20:
        return "Золотая Лига"
    return "Легенда"


# --- AUTH ENDPOINTS ---
@app.post("/auth")
async def auth(data: AuthRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if data.register:
        if not data.email:
            raise HTTPException(400, "Email обязателен для регистрации")
        if db.query(User).filter((User.username == data.username) | (User.email == data.email)).first():
            raise HTTPException(400, "Имя пользователя или Email уже заняты")

        hashed_pw = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        code = "".join(random.choices(string.digits, k=6))

        new_user = User(username=data.username, email=data.email, hashed_password=hashed_pw, verification_code=code)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        db.add(UserStats(user_id=new_user.id, gems=10))  # Даем 10 кристаллов на старте

        # Генерируем стартовые квесты (Дейлики и Сюжетные)
        db.add_all([
            Task(title="Выпить стакан воды", description="Мана нуждается в увлажнении", difficulty="ЛЕГКО", points=20, task_type="daily", user_id=new_user.id),
            Task(title="Прочесть 10 страниц", description="Прокачай интеллект", difficulty="СРЕДНЕ", points=40, task_type="daily", user_id=new_user.id),
            Task(title="Завершить MVP проекта", description="Глобальная цель на неделю", difficulty="СЛОЖНО", points=250, task_type="main", user_id=new_user.id),
        ])
        db.commit()

        # Offload email sending to Celery if configured, otherwise use background task
        try:
            from celery_app import send_email_task
            # Prefer .delay if available (typical Celery API)
            try:
                if hasattr(send_email_task, "delay"):
                    send_email_task.delay(data.email, "Код подтверждения Play2Study", f"Твой код: {code}")
                else:
                    send_email_task(data.email, "Код подтверждения Play2Study", f"Твой код: {code}")
            except Exception:
                # If Celery task invocation fails for any reason, fallback to background task
                background_tasks.add_task(send_email_async, data.email, "Код подтверждения Play2Study", f"Твой код: {code}")
        except Exception:
            background_tasks.add_task(send_email_async, data.email, "Код подтверждения Play2Study", f"Твой код: {code}")

        return {"status": "needs_verification", "email": data.email}
    else:
        user = db.query(User).filter(User.username == data.username).first()
        if not user or not bcrypt.checkpw(data.password.encode("utf-8"), user.hashed_password.encode("utf-8")):
            raise HTTPException(400, "Неверный логин или пароль")
        if not user.is_verified:
            raise HTTPException(403, "Аккаунт не подтвержден. Проверьте почту.")

        access_token = jwt.encode({"sub": user.username, "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)}, SECRET_KEY, algorithm=ALGORITHM)
        return {"access_token": access_token, "username": user.username}


@app.post("/verify")
def verify_email(email: str, code: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email, User.verification_code == code).first()
    if not user:
        raise HTTPException(400, "Неверный код или email")
    user.is_verified = True
    user.verification_code = None
    db.commit()
    return {"status": "ok"}


@app.post("/forgot-password")
async def forgot_password(email: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    code = "".join(random.choices(string.digits, k=6))
    user.verification_code = code
    db.commit()
    background_tasks.add_task(send_email_async, email, "Восстановление пароля Play2Study", f"Код для сброса пароля: {code}")
    return {"status": "email_sent"}


@app.post("/reset-password")
def reset_password(email: str, code: str, new_password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email, User.verification_code == code).first()
    if not user:
        raise HTTPException(400, "Неверный код восстановления")
    user.hashed_password = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user.verification_code = None
    db.commit()
    return {"status": "ok"}


# --- GAME ENDPOINTS ---
@app.get("/stats")
def get_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(UserStats).filter(UserStats.user_id == user.id).first()
    req = s.level * 100
    cur = s.points % req if s.points >= req else s.points
    rank = get_rank_name(s.level)
    return {
        "level": s.level,
        "points": s.points,
        "gems": s.gems,
        "streak_days": s.streak_days,
        "completed_tasks": s.completed_tasks,
        "next_level_points": req,
        "current_level_progress": cur,
        "rank": rank,
    }


@app.get("/tasks")
def get_tasks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.user_id == user.id).all()
    return [{"id": t.id, "title": t.title, "description": t.description, "difficulty": t.difficulty, "points": t.points, "task_type": t.task_type, "completed": t.completed} for t in tasks]


@app.post("/complete_task")
def complete_task(data: TaskComplete, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == data.task_id, Task.user_id == user.id).first()
    if not t or t.completed:
        raise HTTPException(400, "Ошибка задачи")

    t.completed = True
    s = db.query(UserStats).filter(UserStats.user_id == user.id).first()

    # Начисляем опыт и кристаллы (1 кристалл за каждые 10 XP)
    s.points += t.points
    earned_gems = max(1, t.points // 10)
    s.gems += earned_gems
    s.completed_tasks += 1

    if s.points >= s.level * 100:
        s.level += 1
    db.commit()
    return {"status": "ok", "points_earned": t.points, "gems_earned": earned_gems}


@app.post("/buy_item")
def buy_item(data: BuyItemRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(UserStats).filter(UserStats.user_id == user.id).first()
    if s.gems < data.cost:
        raise HTTPException(400, "Недостаточно кристаллов!")

    s.gems -= data.cost

    # Логика применения предмета
    if data.item_id == "xp_potion":
        s.points += 50
        if s.points >= s.level * 100:
            s.level += 1
    elif data.item_id == "streak_freeze":
        pass  # Тут в будущем будет логика заморозки

    db.commit()
    return {"status": "ok", "message": "Предмет успешно куплен!"}


@app.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    # Use a join to avoid N+1 queries
    rows = db.query(User.username, UserStats.level, UserStats.points).join(User, User.id == UserStats.user_id).order_by(UserStats.points.desc()).limit(10).all()
    res = [{"username": r[0], "level": r[1], "points": r[2], "rank": get_rank_name(r[1])} for r in rows]
    return res


@app.get("/leaderboard_cached")
def leaderboard_cached(db: Session = Depends(get_db)):
    key = "leaderboard_v1"
    try:
        cached = cache.get(key)
        if cached:
            return cached
    except Exception:
        cached = None

    rows = db.query(User.username, UserStats.level, UserStats.points).join(User, User.id == UserStats.user_id).order_by(UserStats.points.desc()).limit(10).all()
    res = [{"username": r[0], "level": r[1], "points": r[2], "rank": get_rank_name(r[1])} for r in rows]
    try:
        cache.set(key, res, ex=30)  # cache for 30s
    except Exception:
        pass
    return res


@app.get("/health")
def health(db: Session = Depends(get_db)):
    # DB check
    ok = True
    try:
        db.execute("SELECT 1")
    except Exception:
        ok = False
    # Redis check (best-effort)
    redis_ok = False
    try:
        red = getattr(cache, "client", None)
        if red:
            red.ping()
            redis_ok = True
    except Exception:
        redis_ok = False

    return {"db": ok, "redis": redis_ok}


@app.get("/")
def home():
    # Return explicit JSONResponse with UTF-8 charset to avoid encoding issues on some proxies
    return JSONResponse(content={"message": "Play2Study работает!"}, media_type="application/json; charset=utf-8")
