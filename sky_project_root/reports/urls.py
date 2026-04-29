from django.urls import path
from . import views

urlpatterns = [
    path('', views.report_summary, name='report_summary'),
    path('pdf/', views.export_report_pdf, name='export_report_pdf'),
    path('excel/', views.export_report_excel, name='export_report_excel'),
]
