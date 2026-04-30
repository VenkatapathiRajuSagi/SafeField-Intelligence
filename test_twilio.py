from alerts.sms_alert import send_sms
from alerts.missed_call import send_missed_call
import os
from dotenv import load_dotenv

load_dotenv()

test_phone = os.getenv("FARMER_PHONE", "+910000000000")
send_sms(test_phone, "Test SMS from AI Safety System")
send_missed_call(test_phone)
