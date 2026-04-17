import random
from datetime import datetime, timedelta

otp_store = {}

def generate_otp():
    return str(random.randint(100000, 999999))


def store_otp(email: str, otp: str):
    otp_store[email] = {
        "otp": otp,
        "expires": datetime.utcnow() + timedelta(minutes=5)
    }


def verify_otp(email: str, otp: str):
    data = otp_store.get(email)

    if not data:
        return False, "OTP not found"

    if datetime.utcnow() > data["expires"]:
        return False, "OTP expired"

    if data["otp"] != otp:
        return False, "Invalid OTP"

    del otp_store[email]
    return True, "OTP verified"