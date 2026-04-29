from datetime import timedelta

from django import template
from django.utils import timezone
from django.utils.timesince import timesince

register = template.Library()

@register.filter
def message_time(value):
    if value is None:
        return ''

    now = timezone.localtime(timezone.now())
    sent_at = timezone.localtime(value)

    if now - sent_at < timedelta(days=1):
        return f"{timesince(sent_at, now)} ago"

    return f"{sent_at.day} {sent_at.strftime('%b')}"
