from alerts.sms_alert import send_sms
from alerts.missed_call import send_missed_call
from alerts.voice_alert import voice_alert
from alerts.contacts import FARMER_PHONE, HOSPITAL_PHONE, LOCAL_HELP_PHONE


def route_alert(event_type, recipients=None):
    """
    event_type: type of alert
    recipients: list like ["family", "local_help", "hospital"]
    """

    # ============================
    # DEFAULT RECIPIENT HANDLING
    # ============================
    if recipients is None:
        recipients = []

    # ============================
    # 🐍 SNAKE ALERT
    # ============================
    if event_type == "snake_high":

        send_sms(
            FARMER_PHONE,
            "🐍 Snake detected! Move away immediately."
        )
        send_missed_call(FARMER_PHONE)
        voice_alert(
            "పాము కనిపించింది. దయచేసి ఈ ప్రాంతం నుండి వెంటనే వెళ్లండి"
        )

    # ============================
    # 🔮 PREDICTED HIGH RISK
    # ============================
    elif event_type == "predicted_high":

        send_sms(
            LOCAL_HELP_PHONE,
            "🚨 High risk predicted in your area. Immediate attention required."
        )

    # ============================
    # 🚑 FALL DETECTED
    # ============================
    elif event_type == "fall_detected":

        send_sms(
            HOSPITAL_PHONE,
            "🚑 Farmer fall detected. Emergency assistance required."
        )

    elif event_type == "fall_high":

        send_sms(
            HOSPITAL_PHONE,
            "🚑 FALL DETECTED: Immediate medical assistance required."
        )
        voice_alert(
            "ప్రమాదంగా పడిపోయారు. వెంటనే వైద్య సహాయం అవసరం."
        )

    # ============================
    # 🧠 UNCONSCIOUS / INACTIVITY ALERT (MULTI ROUTE)
    # ============================
    elif event_type == "unconscious_detected":

        # FAMILY ALERT
        if "family" in recipients:
            send_sms(
                FARMER_PHONE,
                "🚨 మీరు చూసే వ్యక్తి అపస్మారక స్థితిలో ఉన్నారు. వెంటనే సహాయం చేయండి!"
            )
            send_missed_call(FARMER_PHONE)

        # LOCAL HELP ALERT
        if "local_help" in recipients:
            send_sms(
                LOCAL_HELP_PHONE,
                "⚠️ దగ్గరలో వ్యక్తి అపస్మారక స్థితిలో ఉన్నారు. దయచేసి సహాయం చేయండి!"
            )
            send_missed_call(LOCAL_HELP_PHONE)

        # HOSPITAL ALERT
        if "hospital" in recipients:
            send_sms(
                HOSPITAL_PHONE,
                "🏥 ఎమర్జెన్సీ: వ్యక్తి అపస్మారక స్థితిలో ఉన్నారు. అంబులెన్స్ పంపండి!"
            )
            send_missed_call(HOSPITAL_PHONE)
            voice_alert(
                "వ్యక్తి అపస్మారక స్థితిలో ఉన్నారు. వెంటనే వైద్య సహాయం అవసరం."
            )

    # ============================
    # ❓ UNKNOWN EVENT
    # ============================
    else:
        print(f"⚠️ Unknown alert type: {event_type}")
