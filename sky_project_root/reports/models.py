from django.db import models


class Team(models.Model):
    team_name = models.CharField(max_length=100)
    manager = models.CharField(max_length=100, null=True, blank=True)
    department = models.CharField(max_length=100)

    def __str__(self):
        return self.team_name