from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    PlatformDashboardActivity,
    PlatformDashboardQuickToolSlot,
    PlatformInboxMessage,
    PlatformPasswordHistory,
    PlatformProfile,
    PlatformScheduleEvent,
    PlatformTeam,
    PlatformTeamDependency,
    PlatformUser,
)


@admin.register(PlatformUser)
class PlatformUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Platform Access', {'fields': ('user_type',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Platform Access', {'fields': ('email', 'user_type')}),
    )
    list_display = ('username', 'email', 'user_type', 'is_staff', 'is_active')
    search_fields = ('username', 'email')


@admin.register(PlatformProfile)
class PlatformProfileAdmin(admin.ModelAdmin):
    list_display = ('platform_user', 'full_name', 'status', 'team_name', 'platform_team')
    list_filter = ('status', 'platform_team')
    autocomplete_fields = ('platform_user', 'platform_team')
    search_fields = (
        'platform_user__username',
        'platform_user__email',
        'full_name',
        'team_name',
        'platform_team__name',
    )


@admin.register(PlatformPasswordHistory)
class PlatformPasswordHistoryAdmin(admin.ModelAdmin):
    list_display = ('platform_user', 'change_source', 'changed_at')
    search_fields = ('platform_user__username', 'platform_user__email')
    readonly_fields = (
        'platform_user',
        'old_password_hash',
        'new_password_hash',
        'change_source',
        'changed_at',
    )


@admin.register(PlatformDashboardQuickToolSlot)
class PlatformDashboardQuickToolSlotAdmin(admin.ModelAdmin):
    list_display = ('platform_user', 'slot_index', 'tool_id', 'updated_at')
    list_filter = ('slot_index',)
    search_fields = ('platform_user__username', 'platform_user__email', 'tool_id')


@admin.register(PlatformDashboardActivity)
class PlatformDashboardActivityAdmin(admin.ModelAdmin):
    list_display = ('platform_user', 'activity_icon', 'activity_text', 'created_at')
    list_filter = ('activity_icon',)
    search_fields = ('platform_user__username', 'platform_user__email', 'activity_text')


@admin.register(PlatformScheduleEvent)
class PlatformScheduleEventAdmin(admin.ModelAdmin):
    list_display = (
        'platform_user',
        'title',
        'event_date',
        'start_time',
        'end_time',
        'platform',
        'invite_members',
    )
    list_filter = ('event_date', 'platform')
    search_fields = (
        'platform_user__username',
        'platform_user__email',
        'title',
        'platform',
        'invite_members',
    )


class PlatformTeamDependencyInline(admin.TabularInline):
    model = PlatformTeamDependency
    extra = 0


@admin.register(PlatformTeam)
class PlatformTeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'team_lead', 'status', 'github_link', 'updated_at')
    list_filter = ('status',)
    search_fields = (
        'name',
        'team_lead',
        'department_name',
        'department_head',
        'github_link',
    )
    prepopulated_fields = {'slug': ('name',)}
    inlines = [PlatformTeamDependencyInline]


@admin.register(PlatformInboxMessage)
class PlatformInboxMessageAdmin(admin.ModelAdmin):
    list_display = (
        'platform_user',
        'message_mode',
        'draft_type',
        'sender_name',
        'sender_email',
        'recipient_name',
        'email_subject',
        'is_reply',
        'is_read',
        'is_hidden_from_user',
        'created_at',
    )
    list_filter = ('message_mode', 'draft_type', 'is_reply', 'is_read', 'is_hidden_from_user')
    search_fields = (
        'platform_user__username',
        'platform_user__email',
        'sender_name',
        'sender_email',
        'recipient_name',
        'recipient_email',
        'email_subject',
        'email_body',
        'previous_message',
        'email_reply',
    )
