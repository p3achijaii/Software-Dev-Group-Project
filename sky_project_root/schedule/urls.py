from django.urls import path
from . import views

urlpatterns = [
    path('', views.meetings_home, name='meetings_home'),
    path('new/', views.schedule_meeting, name='schedule_meeting'),
    path('weekly/', views.weekly_view, name='weekly_view'),
    path('monthly/', views.monthly_view, name='monthly_view'),
]