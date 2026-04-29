from django.contrib import admin
from django.contrib import admin
from .models import Meeting

@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ('title', 'team', 'date_time', 'platform')
    list_filter = ('team', 'platform')