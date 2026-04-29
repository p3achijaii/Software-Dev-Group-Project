from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class PlatformUser(AbstractUser):
    class UserTypeChoices(models.TextChoices):
        USER = 'user', 'User'
        ADMIN = 'admin', 'Admin'

    email = models.EmailField(unique=True)
    user_type = models.CharField(
        max_length=20,
        choices=UserTypeChoices.choices,
        default=UserTypeChoices.USER,
    )

    REQUIRED_FIELDS = ['email']

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()

        return super().save(*args, **kwargs)

    def __str__(self):
        return self.username


class PlatformProfile(models.Model):
    platform_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='platform_profile',
    )
    platform_team = models.ForeignKey(
        'PlatformTeam',
        on_delete=models.SET_NULL,
        related_name='members',
        blank=True,
        null=True,
    )
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=50)
    status = models.CharField(max_length=100)
    team_name = models.CharField(max_length=255, blank=True)
    team_role = models.CharField(max_length=255)
    department_name = models.CharField(max_length=255)
    department_head = models.CharField(max_length=255)
    member_skills = models.TextField()
    profile_image = models.BinaryField(blank=True, null=True)
    profile_image_content_type = models.CharField(max_length=100, blank=True)

    def save(self, *args, **kwargs):
        updateFields = kwargs.get('update_fields')
        teamFieldsTouched = False

        if self.platform_team_id:
            teamName = self.platform_team.name
            if self.team_name != teamName:
                self.team_name = teamName
                teamFieldsTouched = True
        else:
            teamName = (self.team_name or '').strip()
            if self.team_name != teamName:
                self.team_name = teamName
                teamFieldsTouched = True

            if teamName:
                matchedTeam = PlatformTeam.objects.filter(name__iexact=teamName).first()
                if matchedTeam:
                    self.platform_team = matchedTeam
                    self.team_name = matchedTeam.name
                    teamFieldsTouched = True

        if updateFields is not None and teamFieldsTouched:
            kwargs['update_fields'] = set(updateFields) | {'platform_team', 'team_name'}

        return super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.platform_user.username} profile'


class PlatformAccount(models.Model):
    platform_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='platform_account',
    )
    full_name = models.CharField(max_length=255)
    username = models.CharField(max_length=150)
    email = models.EmailField()
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=50)
    status = models.CharField(max_length=100)
    team_name = models.CharField(max_length=255)
    team_role = models.CharField(max_length=255)
    department_name = models.CharField(max_length=255)
    department_head = models.CharField(max_length=255)
    member_skills = models.TextField()

    def __str__(self):
        return f'{self.platform_user.username} account'


class PlatformPasswordHistory(models.Model):
    class ChangeSourceChoices(models.TextChoices):
        RESET = 'reset', 'Reset'

    platform_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_history_entries',
    )
    old_password_hash = models.CharField(max_length=255)
    new_password_hash = models.CharField(max_length=255)
    change_source = models.CharField(
        max_length=20,
        choices=ChangeSourceChoices.choices,
        default=ChangeSourceChoices.RESET,
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f'{self.platform_user.username} password change'


class PlatformDashboardQuickToolSlot(models.Model):
    class SlotIndexChoices(models.IntegerChoices):
        FIRST = 0, 'Slot 1'
        SECOND = 1, 'Slot 2'
        THIRD = 2, 'Slot 3'

    platform_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dashboard_quick_tool_slots',
    )
    slot_index = models.PositiveSmallIntegerField(choices=SlotIndexChoices.choices)
    tool_id = models.CharField(max_length=50)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['slot_index']
        constraints = [
            models.UniqueConstraint(
                fields=['platform_user', 'slot_index'],
                name='unique_dashboard_quick_tool_slot',
            ),
        ]

    def __str__(self):
        return f'{self.platform_user.username} slot {self.slot_index}'


class PlatformDashboardActivity(models.Model):
    class ActivityIconChoices(models.TextChoices):
        GITHUB = 'github', 'GitHub'
        TEAM = 'team', 'Team'
        CALENDAR = 'calendar', 'Calendar'
        REPORT = 'report', 'Report'
        MESSAGE = 'message', 'Message'

    platform_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dashboard_activities',
    )
    activity_text = models.CharField(max_length=255)
    activity_icon = models.CharField(
        max_length=50,
        choices=ActivityIconChoices.choices,
        default=ActivityIconChoices.GITHUB,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.platform_user.username} activity'


class PlatformScheduleEvent(models.Model):
    platform_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='schedule_events',
    )
    title = models.CharField(max_length=255, blank=True)
    event_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    platform = models.CharField(max_length=100)
    invite_members = models.CharField(max_length=500)
    color = models.CharField(max_length=50, default='rgba(37, 99, 235, 1)')
    color_secondary = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['event_date', 'start_time', 'id']

    def __str__(self):
        eventTitle = self.title or f'Event with {self.invite_members}'
        return f'{self.platform_user.username} schedule event: {eventTitle}'


class PlatformTeam(models.Model):
    class TeamStatusChoices(models.TextChoices):
        ACTIVE = 'active', 'Active'
        REVIEW = 'review', 'On review'
        INACTIVE = 'inactive', 'Inactive'

    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True)
    team_lead = models.CharField(max_length=255)
    github_link = models.URLField(max_length=500, blank=True)
    status = models.CharField(
        max_length=20,
        choices=TeamStatusChoices.choices,
        default=TeamStatusChoices.ACTIVE,
    )
    department_name = models.CharField(max_length=255, blank=True)
    department_head = models.CharField(max_length=255, blank=True)
    key_contact_1 = models.CharField(max_length=255, blank=True)
    key_contact_2 = models.CharField(max_length=255, blank=True)
    jira_project_name = models.CharField(max_length=255, blank=True)
    jira_board_link = models.URLField(max_length=500, blank=True)
    git_project_name = models.CharField(max_length=255, blank=True)
    software_owned = models.CharField(max_length=255, blank=True)
    versioning_approaches = models.CharField(max_length=255, blank=True)
    wiki_link = models.URLField(max_length=500, blank=True)
    wiki_search_terms = models.CharField(max_length=255, blank=True)
    slack_channels = models.CharField(max_length=500, blank=True)
    slack_link = models.URLField(max_length=500, blank=True)
    daily_standup_time = models.TimeField(blank=True, null=True)
    daily_standup_link = models.URLField(max_length=500, blank=True)
    about_team = models.TextField(blank=True)
    key_skills = models.TextField(blank=True)
    focus_areas = models.TextField(blank=True)
    team_image = models.BinaryField(blank=True, null=True)
    team_image_content_type = models.CharField(max_length=100, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class PlatformTeamDependency(models.Model):
    platform_team = models.ForeignKey(
        PlatformTeam,
        on_delete=models.CASCADE,
        related_name='team_dependencies',
    )
    dependency_name = models.CharField(max_length=255)
    is_upstream = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20,
        choices=PlatformTeam.TeamStatusChoices.choices,
        default=PlatformTeam.TeamStatusChoices.ACTIVE,
    )
    updated_label = models.CharField(max_length=100, default='Recently')

    class Meta:
        ordering = ['dependency_name']

    def __str__(self):
        return f'{self.platform_team.name} dependency {self.dependency_name}'


class PlatformReport(models.Model):
    class KindChoices(models.TextChoices):
        REPORT = 'report', 'Report'
        CHART = 'chart', 'Chart'

    class DocTypeChoices(models.TextChoices):
        PDF = 'pdf', 'PDF'
        XLSX = 'xlsx', 'Excel'

    platform_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='platform_reports',
    )
    kind = models.CharField(
        max_length=10,
        choices=KindChoices.choices,
        default=KindChoices.REPORT,
    )
    report_type = models.CharField(max_length=100)
    doc_type = models.CharField(
        max_length=10,
        choices=DocTypeChoices.choices,
        default=DocTypeChoices.PDF,
    )
    title = models.CharField(max_length=255)
    payload_json = models.JSONField(default=dict, blank=True)
    file_blob = models.BinaryField(blank=True, null=True)
    file_content_type = models.CharField(max_length=100, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.platform_user.username} {self.kind} {self.title}'


class PlatformInboxMessage(models.Model):
    class MessageModeChoices(models.TextChoices):
        INBOX = 'inbox', 'Inbox'
        SENT = 'sent', 'Sent'
        DRAFTS = 'drafts', 'Drafts'

    class DraftTypeChoices(models.TextChoices):
        COMPOSE = 'compose', 'Compose'
        REPLY = 'reply', 'Reply'

    platform_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='inbox_messages',
    )
    message_mode = models.CharField(
        max_length=20,
        choices=MessageModeChoices.choices,
        default=MessageModeChoices.INBOX,
    )
    draft_type = models.CharField(
        max_length=20,
        choices=DraftTypeChoices.choices,
        blank=True,
    )
    sender_name = models.CharField(max_length=255)
    sender_email = models.EmailField()
    recipient_name = models.CharField(max_length=255, blank=True)
    recipient_email = models.EmailField(blank=True)
    email_subject = models.CharField(max_length=255)
    email_body = models.TextField()
    previous_message = models.TextField(blank=True)
    email_reply = models.TextField(blank=True)
    is_reply = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    is_hidden_from_user = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    replied_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.platform_user.username} inbox message'
