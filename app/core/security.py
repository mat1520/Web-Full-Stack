import re

_TAG_PATTERN = re.compile(r"<[^>]+>")
_MULTI_SPACE = re.compile(r"\s+")


def sanitize_text(raw: str) -> str:
    cleaned = _TAG_PATTERN.sub("", raw)
    return _MULTI_SPACE.sub(" ", cleaned).strip()
