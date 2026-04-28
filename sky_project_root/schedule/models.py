from django.db import models
from django.contrib.auth.models import User
from team.models import Team   # ← uses existing Team model


class Meeting(models.Model):
    PLATFORM_CHOICES = [
        ('Zoom', 'Zoom'),
        ('Teams', 'Microsoft Teams'),
        ('Meet', 'Google Meet'),
        ('InPerson', 'In Person'),
    ]

    title = models.CharField(max_length=200)
    date_time = models.DateTimeField()
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    message = models.TextField(blank=True)

    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    organiser = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.title