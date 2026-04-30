from django.urls import path
from . import views

urlpatterns = [
    path('',         views.meetings_home,   name='meetings_home'),
    path('new/',     views.schedule_meeting, name='schedule_meeting'),
    path('weekly/',  views.weekly_view,     name='weekly_view'),
    path('monthly/', views.monthly_view,    name='monthly_view'),
    # added
    path('edit/<int:meeting_id>/',   views.edit_meeting,   name='edit_meeting'),
    path('delete/<int:meeting_id>/', views.delete_meeting, name='delete_meeting'),
]
