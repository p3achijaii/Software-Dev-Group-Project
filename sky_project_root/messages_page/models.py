from django.conf import settings
from django.db import models

class Message(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_messages'
    )
    subject = models.CharField(max_length=255)
    body = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    is_draft = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.subject} from {self.sender} to {self.recipient}"