from django.urls import path
from . import views

urlpatterns = [
    path('', views.report_summary, name='report_summary'),
    path('', views.report_view, name='reports'),
    path('download/pdf/', views.export_report_pdf, name='export_report_pdf'),
    path('download/excel/', views.export_report_excel, name='export_report_excel'),
]
