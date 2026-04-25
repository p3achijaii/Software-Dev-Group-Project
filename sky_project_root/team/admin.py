from django.contrib import admin
from .models import Department, Staff, Team, Skill, TeamSkill, TeamMember


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("departmentID", "departmentName", "leader")
    search_fields = ("departmentName",)


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ("staffID", "firstName", "lastName", "emailAddress", "department")
    search_fields = ("firstName", "lastName", "emailAddress")
    list_filter = ("department",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("teamID", "teamName", "department", "teamLeader")
    search_fields = ("teamName",)
    list_filter = ("department",)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("skillID", "skillName", "skillCategory")
    search_fields = ("skillName", "skillCategory")


@admin.register(TeamSkill)
class TeamSkillAdmin(admin.ModelAdmin):
    list_display = ("team", "skill")
    list_filter = ("team", "skill")


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ("staff", "team", "dateJoined")
    list_filter = ("team",)
    search_fields = ("staff__firstName", "staff__lastName")
