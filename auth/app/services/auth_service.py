from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.user import UserCreate

def register_user(db: Session, user_data: UserCreate):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        return None
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    new_user = User(
        email=user_data.email,
        password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def login_user(db: Session, email: str, password: str):
    # 🔍 Find user
    user = db.query(User).filter(User.email == email).first()

    # ❌ Check user + password
    if not user or not verify_password(password, user.password):
        return None

    # 🎟️ Generate token using user.id as 'sub' for stability
    token = create_access_token({
        "sub": str(user.id)
    })

    return token