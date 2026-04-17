from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from app.db.database import SessionLocal
from app.schemas.user import UserLogin, UserCreate, Token, TokenData, User as UserSchema
from app.services.auth_service import login_user, register_user

from app.models.user import User as UserModel
from app.core.config import SECRET_KEY, ALGORITHM
from app.schemas.auth_schema import EmailRequest, VerifyOTPRequest, CompleteSignupRequest

from app.services.otp_service import generate_otp, store_otp, verify_otp
from app.services.email_service import send_otp_email

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency to get current user from token
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(UserModel).filter(UserModel.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

# @router.post("/signup", response_model=UserSchema)
# def signup(user: UserCreate, db: Session = Depends(get_db)):
#     db_user = register_user(db, user)
#     if not db_user:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Email already registered"
#         )
#     return db_user

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    # 🔑 Verify password and get token in one go
    token = login_user(db, user.email, user.password)
    
    if not token:
        # Check if user exists to give a better error message if desired, 
        # but for performance/security we can just be generic.
        # Here we follow the user's previous logic but optimized.
        db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="New user? Please sign up first."
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong password"
        )

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: UserModel = Depends(get_current_user)):
    return current_user


@router.post("/send-otp")
def send_otp(request: EmailRequest, db: Session = Depends(get_db)):

    # 🔥 1. Check if user already exists
    existing_user = db.query(UserModel).filter(UserModel.email == request.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    # 🔥 2. Generate OTP
    otp = generate_otp()

    # 🔥 3. Store OTP
    store_otp(request.email, otp)

    # 🔥 4. Send email
    send_otp_email(request.email, otp)

    return {"message": "OTP sent"}


@router.post("/verify-otp")
def verify(request: VerifyOTPRequest):
    valid, msg = verify_otp(request.email, request.otp)

    if not valid:
        raise HTTPException(400, msg)

    # 👉 Create a short-lived signup token (10 mins) to prove email verification
    from datetime import timedelta
    from app.core.security import create_access_token
    
    signup_token = create_access_token(
        data={"sub": request.email, "type": "signup"},
        expires_delta=timedelta(minutes=10)
    )

    return {
        "message": "OTP verified",
        "signup_token": signup_token
    }

@router.post("/complete-signup", response_model=Token)
def complete_signup(request: CompleteSignupRequest, db: Session = Depends(get_db)):
    # 1. Verify signup token
    try:
        payload = jwt.decode(request.signup_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email != request.email or token_type != "signup":
            raise HTTPException(status_code=400, detail="Invalid signup token")
    except JWTError:
        raise HTTPException(status_code=400, detail="Signup token expired or invalid")

    # 2. Register user
    new_user = register_user(db, UserCreate(email=request.email, password=request.password))
    if not new_user:
        raise HTTPException(status_code=400, detail="User already registered")

    # 3. Auto-login after registration
    from app.core.security import create_access_token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }