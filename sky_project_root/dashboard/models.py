from django.db import models
from django.contrib.auth.models import User

class Activity(models.Model):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Activities"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.actor} - {self.action}"

    @property
    def initials(self):
        if self.actor and self.actor.first_name and self.actor.last_name:
            return f"{self.actor.first_name[0]}{self.actor.last_name[0]}".upper()
        if self.actor:
            return self.actor.username[:2].upper()
        return "SY"