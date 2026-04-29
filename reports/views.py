from django.shortcuts import render
from django.http import HttpResponse
import io, openpyxl
from xhtml2pdf import pisa
from datetime import datetime

# Temporary mini dataset (remove when connected to real Team model)
class Team:
    def __init__(self, teamName, manager, department):
        self.teamName = teamName
        self.manager = manager
        self.department = department

TEAM_DATA = [
    Team("Engineering Core", "Maria-Tamara", "Backend"),
    Team("UI Crew", None, "Frontend"),
    Team("CloudOps", "Alexzander", "Infrastructure")
]

def report_summary(request):
    total_teams = len(TEAM_DATA)
    teams_without_manager = [t for t in TEAM_DATA if not t.manager]
    return render(request, 'reports/report_summary.html', {
        'teams': TEAM_DATA,
        'total_teams': total_teams,
        'teams_without_manager': teams_without_manager,
        'generated_on': datetime.now(),
    })

def export_report_pdf(request):
    html = render(request, 'reports/base_reports.html', {
        'teams': TEAM_DATA,
        'total_teams': len(TEAM_DATA),
        'teams_without_manager': [t for t in TEAM_DATA if not t.manager],
        'generated_on': datetime.now(),
    }).content.decode('utf-8')

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="Teams_Report.pdf"'
    pisa.CreatePDF(io.StringIO(html), dest=response)
    return response

def export_report_excel(request):
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "Teams Summary"
    sheet.append(["Team", "Manager", "Department"])
    for t in TEAM_DATA:
        sheet.append([t.teamName, t.manager or "No Manager", t.department])
    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="Teams_Report.xlsx"'
    return response