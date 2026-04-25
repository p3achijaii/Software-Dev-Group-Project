from django.db import models
from team.models import Team

class TeamDependency(models.Model):
    team = models.ForeignKey(Team, related_name='dependencies', on_delete=models.CASCADE)
    depends_on = models.ForeignKey(Team, related_name='dependent_teams', on_delete=models.CASCADE)

    dependencyType=models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"{self.team} depends on {self.depends_on}"