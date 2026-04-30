"""
URL configuration for sky_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from graphs.views import visualization_dashboard
from dashboard.views import dashboard 
from users.views import profile_view, profile_update, register_view 

urlpatterns = [
    path('admin/', admin.site.urls),
    path("", RedirectView.as_view(url="/dashboard/", permanent=False)),
    path("teams/", include("team.urls")),
    path('accounts/', include('django.contrib.auth.urls')),
    path('organisation/', include('organisation.urls')),
    path('dashboard/', dashboard, name='dashboard'),  
    path('insights/', visualization_dashboard, name='insight'),
    path('profile/', profile_view, name='profile'),
    path('profile/update/', profile_update, name='profile_update'),
    path('accounts/register/', register_view, name='register'),
    path('reports/', include('reports.urls')),
    path('calendar/', include('schedule.urls')),
]