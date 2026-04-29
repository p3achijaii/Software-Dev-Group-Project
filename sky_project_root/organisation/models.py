from django.db import models
from team.models import Team
#represents dependency types between teams
class DependencyType(models.Model):
    name = models.CharField(max_length=50, verbose_name="Dependency Type")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Dependency Type"
        verbose_name_plural = "Dependency Types"
#represents dependency between teams
class TeamDependency(models.Model):
    team = models.ForeignKey(Team, related_name='dependencies', on_delete=models.CASCADE)

    depends_on = models.ForeignKey(Team, related_name='dependent_teams', on_delete=models.CASCADE, verbose_name="Team it depends on")

    dependency_type = models.ForeignKey(DependencyType, on_delete=models.SET_NULL, null=True, blank=True)

    DIRECTION_CHOICES = [
        ('UPSTREAM', 'Upstream'),
        ('DOWNSTREAM', 'Downstream'),
    ]

    direction = models.CharField(
        max_length=20,
        choices=DIRECTION_CHOICES
    )

    def __str__(self):
        return f"{self.team} depends on {self.depends_on}"
    #data models contain meta to ensure proper wording on the admin page
    class Meta:
        verbose_name = "Team Dependency"
        verbose_name_plural = "Team Dependencies"