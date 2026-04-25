from django.db import models

class Department(models.Model):
    departmentID = models.AutoField(primary_key=True)
    departmentName = models.CharField(max_length=100)
    deptHead = models.ForeignKey('Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='headed_departments')
    def __str__(self):
        return self.departmentName


class Staff(models.Model):
    staffID = models.AutoField(primary_key=True)
    firstName = models.CharField(max_length=100)
    lastName = models.CharField(max_length=100)
    emailAddress = models.EmailField()
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='staff_members')

    def __str__(self):
        return f"{self.firstName} {self.lastName}"


class Team(models.Model):
    teamID = models.AutoField(primary_key=True)
    teamName = models.CharField(max_length=100)

    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='teams')
    teamLeader = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='led_teams')

    def __str__(self):
        return self.teamName

class Skill(models.Model):
    skillID = models.AutoField(primary_key=True)
    skillName = models.CharField(max_length=100)
    skillCategory = models.CharField(max_length=100)

    def __str__(self):
        return self.skillName


class TeamSkill(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.team} - {self.skill}"

class TeamMember(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)