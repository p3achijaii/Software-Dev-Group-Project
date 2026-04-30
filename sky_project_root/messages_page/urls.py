from django.urls import path
from django.views.generic import RedirectView

from . import views

app_name = 'messages_page'

urlpatterns = [
    path('', RedirectView.as_view(pattern_name='messages_page:inbox', permanent=False)),
    path('inbox/', views.inbox, name='inbox'),
    path('sent/', views.sent_messages, name='sent_messages'),
    path('drafts/', views.drafts, name='drafts'),
    path('compose/', views.compose, name='compose'),
    path('compose/<int:pk>/', views.compose, name='compose_draft'),
    path('<int:pk>/', views.message_detail, name='message_detail'),
]