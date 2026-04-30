from twilio.rest import Client
import os
from dotenv import load_dotenv

load_dotenv()

client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_AUTH"))
TWILIO_NUMBER = os.getenv("TWILIO_NUMBER")

def send_missed_call(to_number):
    call = client.calls.create(
        to=to_number,
        from_=TWILIO_NUMBER,
        url="http://demo.twilio.com/docs/voice.xml",
        timeout=6
    )
    print(f"📞 Missed call triggered to {to_number} | SID: {call.sid}")
