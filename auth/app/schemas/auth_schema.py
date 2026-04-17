from pydantic import BaseModel

class EmailRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class CompleteSignupRequest(BaseModel):
    email: str
    password: str
    signup_token: str