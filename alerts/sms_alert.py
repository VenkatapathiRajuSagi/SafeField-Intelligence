from twilio.rest import Client
import os
from dotenv import load_dotenv

load_dotenv()

client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_AUTH"))
TWILIO_NUMBER = os.getenv("TWILIO_NUMBER")

def send_sms(to, message):
    msg = client.messages.create(
        body=message,
        from_=TWILIO_NUMBER,
        to=to
    )
    print(f"📩 SMS sent to {to} | SID: {msg.sid}")
