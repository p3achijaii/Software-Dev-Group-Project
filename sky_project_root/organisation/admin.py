from django.contrib import admin
from .models import TeamDependency, DependencyType

#Registers dependency models for admin interface
@admin.register(DependencyType)
class DependencyTypeAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(TeamDependency)
class TeamDependencyAdmin(admin.ModelAdmin):
    list_display = ("team", "depends_on", "dependency_type")
    list_filter = ("dependency_type",)
    search_fields = ("team__teamName", "depends_on__teamName")
