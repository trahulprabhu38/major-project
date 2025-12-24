import re

def clean_text(text):
    text = text.replace("\r", "")
    text = re.sub(r"\n{2,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"Page \d+ of \d+", "", text)
    return text.strip()
