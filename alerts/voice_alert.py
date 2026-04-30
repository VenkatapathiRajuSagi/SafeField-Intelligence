from gtts import gTTS
import os

def voice_alert(text, lang="te"):
    tts = gTTS(text=text, lang=lang)
    file = "audio/alert.mp3"
    tts.save(file)
    os.system(f"open {file}" if os.name == "posix" else f"start {file}")
