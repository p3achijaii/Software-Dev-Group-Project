from django.db import models
from django.utils.text import slugify
from django.db.models.signals import pre_save
from django.dispatch import receiver

class Department(models.Model):
    departmentID = models.AutoField(primary_key=True, verbose_name="Department ID")
    departmentName = models.CharField(max_length=100, verbose_name="Department Name")
    leader = models.ForeignKey(
        'Staff',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_departments',
        verbose_name="Department Head"
    )

    def __str__(self):
        return self.departmentName

class Staff(models.Model):
    staffID = models.AutoField(primary_key=True, verbose_name="Staff ID")
    firstName = models.CharField(max_length=100, verbose_name="First Name")
    lastName = models.CharField(max_length=100, verbose_name="Last Name")
    emailAddress = models.EmailField(null=True, blank=True, verbose_name="Email Address")
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='staff_members',
        verbose_name="Department"
    )

    def __str__(self):
        return f"{self.firstName} {self.lastName}"

    class Meta:
        verbose_name = "Staff"
        verbose_name_plural = "Staff"

class DevelopmentFocus(models.Model):
    name = models.CharField(max_length=100, verbose_name="Development Focus Area")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Development Focus Area"
        verbose_name_plural = "Development Focus Areas"

class Team(models.Model):
    teamID = models.AutoField(primary_key=True, verbose_name="Team ID")
    teamName = models.CharField(max_length=100, verbose_name="Team Name")
    
    # Set unique=False so that multiple JSON files can load without crashing
    slug = models.SlugField(max_length=120, unique=False, blank=True, null=True)
    
    keySkills = models.TextField(null=True, blank=True, verbose_name="Key Skills & Technologies")
    developmentFocusAreas = models.TextField(null=True, blank=True, verbose_name="Focus Areas Text")
    
    developmentFocus = models.ManyToManyField(
        DevelopmentFocus,
        blank=True,
        verbose_name="Development Focus Areas (Linked)"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='teams',
        verbose_name="Team Department"
    )
    teamLeader = models.ForeignKey(
        Staff,
        on_delete=models.CASCADE,
        related_name='led_teams',
        verbose_name="Team Leader"
    )

    def save(self, *args, **kwargs):
        # Traditional save logic for manual entry
        if not self.slug:
            self.slug = slugify(self.teamName)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.teamName

class Skill(models.Model):
    skillID = models.AutoField(primary_key=True, verbose_name="Skill ID")
    skillName = models.CharField(max_length=100, verbose_name="Skill Name")
    skillCategory = models.CharField(max_length=100, verbose_name="Skill Category")

    def __str__(self):
        return self.skillName

class TeamSkill(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='team_skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='skill_teams')

    class Meta:
        verbose_name = "Team Skill"
        verbose_name_plural = "Team Skills"

class TeamMember(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='team_memberships')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='members')
    dateJoined = models.DateField(null=True, blank=True, verbose_name="Date Joined")

    class Meta:
        verbose_name = "Team Member"
        verbose_name_plural = "Team Members"

# --- SIGNALS SECTION ---
# This ensures data coming from loaddata (JSON) gets a slug automatically.
@receiver(pre_save, sender=Team)
def auto_slug_generator(sender, instance, **kwargs):
    if not instance.slug or instance.slug == "None" or instance.slug == "":
        instance.slug = slugify(instance.teamName)