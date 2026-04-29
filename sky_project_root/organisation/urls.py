from django.urls import path
from .views import organisation_view

urlpatterns = [
    path('', organisation_view, name='organisation'),
]