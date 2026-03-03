# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import random
import string
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

# --- КОНФИГ ПОЧТЫ (ЗАПОЛНИ СВОИМИ ДАННЫМИ!) ---
conf = ConnectionConfig(
    MAIL_USERNAME = "batyrtorakhan@gmail.com",
    MAIL_PASSWORD = "sbgjjkvcevnmmgws",
    MAIL_FROM = "batyrtorakhan@gmail.com",
    MAIL_PORT = 587,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

SECRET_KEY = "super-secret-key-2026-change-this"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

app = FastAPI(title="Play2Study API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- БАЗА ДАННЫХ ---
DATABASE_URL = "sqlite:///./play2study.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase): pass

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
    user_id = Column(Integer, ForeignKey("users.id"))
    level = Column(Integer, default=1)
    points = Column(Integer, default=0)
    gems = Column(Integer, default=0) # Игровая валюта
    streak_days = Column(Integer, default=0)
    completed_tasks = Column(Integer, default=0)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(String)
    difficulty = Column(String)
    points = Column(Integer)
    task_type = Column(String, default="main") # 'daily' или 'main'
    completed = Column(Boolean, default=False)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- СХЕМЫ ДАННЫХ ---
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

# --- УТИЛИТЫ ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(401)
    except JWTError:
        raise HTTPException(401, "Недействительный токен")
    user = db.query(User).filter(User.username == username).first()
    if user is None: raise HTTPException(401)
    return user

async def send_email_async(email: str, subject: str, body: str):
    try:
        message = MessageSchema(subject=subject, recipients=[email], body=body, subtype=MessageType.plain)
        fm = FastMail(conf)
        await fm.send_message(message)
    except Exception as e:
        print(f"Ошибка отправки письма: {e}")

def get_rank_name(level: int) -> str:
    if level < 5: return "Бронзовая Лига"
    if level < 10: return "Серебряная Лига"
    if level < 20: return "Золотая Лига"
    return "Легенда"

# --- ЭНДПОИНТЫ АВТОРИЗАЦИИ ---
@app.post("/auth")
async def auth(data: AuthRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if data.register:
        if not data.email: raise HTTPException(400, "Email обязателен для регистрации")
        if db.query(User).filter((User.username == data.username) | (User.email == data.email)).first():
            raise HTTPException(400, "Имя пользователя или Email уже заняты")
        
        hashed_pw = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        code = "".join(random.choices(string.digits, k=6))
        
        new_user = User(username=data.username, email=data.email, hashed_password=hashed_pw, verification_code=code)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        db.add(UserStats(user_id=new_user.id, gems=10)) # Даем 10 кристалов на старте
        
        # Генерируем стартовые квесты (Дейлики и Сюжетные)
        db.add_all([
            Task(title="Выпить стакан воды", description="Мана нуждается в увлажнении", difficulty="ЛЕГКО", points=20, task_type="daily", user_id=new_user.id),
            Task(title="Прочесть 10 страниц", description="Прокачай интеллект", difficulty="СРЕДНЕ", points=40, task_type="daily", user_id=new_user.id),
            Task(title="Завершить MVP проекта", description="Глобальная цель на неделю", difficulty="СЛОЖНО", points=250, task_type="main", user_id=new_user.id)
        ])
        db.commit()

        background_tasks.add_task(send_email_async, data.email, "Код подтверждения Play2Study", f"Твой код: {code}")
        return {"status": "needs_verification", "email": data.email}
    else:
        user = db.query(User).filter(User.username == data.username).first()
        if not user or not bcrypt.checkpw(data.password.encode('utf-8'), user.hashed_password.encode('utf-8')):
            raise HTTPException(400, "Неверный логин или пароль")
        if not user.is_verified:
            raise HTTPException(403, "Аккаунт не подтвержден. Проверьте почту.")

        access_token = jwt.encode({"sub": user.username, "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)}, SECRET_KEY, algorithm=ALGORITHM)
        return {"access_token": access_token, "username": user.username}

@app.post("/verify")
def verify_email(email: str, code: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email, User.verification_code == code).first()
    if not user: raise HTTPException(400, "Неверный код или email")
    user.is_verified = True
    user.verification_code = None
    db.commit()
    return {"status": "ok"}

@app.post("/forgot-password")
async def forgot_password(email: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user: raise HTTPException(404, "Пользователь не найден")
    code = "".join(random.choices(string.digits, k=6))
    user.verification_code = code
    db.commit()
    background_tasks.add_task(send_email_async, email, "Восстановление пароля Play2Study", f"Код для сброса пароля: {code}")
    return {"status": "email_sent"}

@app.post("/reset-password")
def reset_password(email: str, code: str, new_password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email, User.verification_code == code).first()
    if not user: raise HTTPException(400, "Неверный код восстановления")
    user.hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user.verification_code = None
    db.commit()
    return {"status": "ok"}

# --- ИГРОВЫЕ ЭНДПОИНТЫ ---
@app.get("/stats")
def get_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(UserStats).filter(UserStats.user_id == user.id).first()
    req = s.level * 100
    cur = s.points % req if s.points >= req else s.points
    rank = get_rank_name(s.level)
    return {
        "level": s.level, "points": s.points, "gems": s.gems, 
        "streak_days": s.streak_days, "completed_tasks": s.completed_tasks, 
        "next_level_points": req, "current_level_progress": cur, "rank": rank
    }

@app.get("/tasks")
def get_tasks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.user_id == user.id).all()
    return [{"id": t.id, "title": t.title, "description": t.description, "difficulty": t.difficulty, "points": t.points, "task_type": t.task_type, "completed": t.completed} for t in tasks]

@app.post("/complete_task")
def complete_task(data: TaskComplete, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == data.task_id, Task.user_id == user.id).first()
    if not t or t.completed: raise HTTPException(400, "Ошибка задачи")
    
    t.completed = True
    s = db.query(UserStats).filter(UserStats.user_id == user.id).first()
    
    # Начисляем опыт и кристаллы (1 кристалл за каждые 10 XP)
    s.points += t.points
    earned_gems = max(1, t.points // 10)
    s.gems += earned_gems
    s.completed_tasks += 1
    
    if s.points >= s.level * 100: s.level += 1
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
        if s.points >= s.level * 100: s.level += 1
    elif data.item_id == "streak_freeze":
        pass # Тут в будущем будет логика заморозки

    db.commit()
    return {"status": "ok", "message": "Предмет успешно куплен!"}

@app.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    top = db.query(UserStats).order_by(UserStats.points.desc()).limit(10).all()
    res = []
    for s in top:
        u = db.query(User).filter(User.id == s.user_id).first()
        res.append({"username": u.username, "level": s.level, "points": s.points, "rank": get_rank_name(s.level)})
    return res