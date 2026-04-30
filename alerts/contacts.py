import os
from dotenv import load_dotenv

load_dotenv()

FARMER_PHONE = os.getenv("FARMER_PHONE", "+910000000000")
HOSPITAL_PHONE = os.getenv("HOSPITAL_PHONE", "+910000000000")
LOCAL_HELP_PHONE = os.getenv("LOCAL_HELP_PHONE", "+910000000000")
