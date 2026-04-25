from django.db import models

class Department(models.Model):
    departmentID = models.AutoField(primary_key=True, verbose_name="Department ID")
    departmentName = models.CharField(max_length=100, verbose_name="Department Name")
    leader = models.ForeignKey('Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='headed_departments', verbose_name="Department Head")
    def __str__(self):
        return self.departmentName


class Staff(models.Model):
    staffID = models.AutoField(primary_key=True, verbose_name="Staff ID")
    firstName = models.CharField(max_length=100, verbose_name="First Name")
    lastName = models.CharField(max_length=100, verbose_name="Last Name")
    emailAddress = models.EmailField(null=True, blank = True, verbose_name="Email Address")
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='staff_members', verbose_name="Department")

    def __str__(self):
        return f"{self.firstName} {self.lastName}"
    
    class Meta:
        verbose_name = "Staff"
        verbose_name_plural = "Staff"


class Team(models.Model):
    teamID = models.AutoField(primary_key=True, verbose_name="Team ID")
    teamName = models.CharField(max_length=100, verbose_name="Team Name")

    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='teams', verbose_name="Team Department")
    teamLeader = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='led_teams', verbose_name="Team Leader")

    def __str__(self):
        return self.teamName

class Skill(models.Model):
    skillID = models.AutoField(primary_key=True, verbose_name="Skill ID")
    skillName = models.CharField(max_length=100, verbose_name="Skill Name")
    skillCategory = models.CharField(max_length=100, verbose_name="Skill Category")

    def __str__(self):
        return self.skillName


class TeamSkill(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.team} - {self.skill}"

    class Meta:
        verbose_name = "Team Skill"
        verbose_name_plural = "Team Skills"

class TeamMember(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    dateJoined = models.DateField(null=True, blank=True, verbose_name="Date Joined")

    def __str__(self):
        return f"{self.staff} in {self.team}"
    
    class Meta:
        verbose_name = "Team Member"
        verbose_name_plural = "Team Members"