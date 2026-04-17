import smtplib
from email.mime.text import MIMEText
import os


from fastapi import HTTPException

def send_otp_email(to_email: str, otp: str):
    sender = os.getenv("EMAIL_USER")
    password = os.getenv("EMAIL_PASS")

    if not sender or not password:
        raise HTTPException(status_code=500, detail="Email service not configured")

    subject = "Your OTP Code"

    body = f"""
    <h2>Your OTP is: {otp}</h2>
    <p>This OTP is valid for 5 minutes.</p>
    <br/>
    <small>ChatBot Team</small>
    """

    msg = MIMEText(body, "html")
    msg["Subject"] = subject
    msg["From"] = f"ChatBot <{sender}>"
    msg["To"] = to_email

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender, password)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"SMTP Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again later.")