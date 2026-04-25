from django.db import models
from team.models import Team

class DependencyType(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Dependency Type"
        verbose_name_plural = "Dependency Types"

class TeamDependency(models.Model):
    team = models.ForeignKey(Team, related_name='dependencies', on_delete=models.CASCADE)

    depends_on = models.ForeignKey(Team, related_name='dependent_teams', on_delete=models.CASCADE)

    dependency_type = models.ForeignKey(DependencyType, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.team} depends on {self.depends_on}"
    
    class Meta:
        verbose_name = "Team Dependency"
        verbose_name_plural = "Team Dependencies"