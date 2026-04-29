from django.shortcuts import render
from django.http import HttpResponse
import io, openpyxl
from xhtml2pdf import pisa
from datetime import datetime
from team.models import Team



def report_summary(request):
    teams = Team.objects.all()
    total_teams = teams.count()
    teams_without_manager = teams.filter(manager__isnull=True)
    return render(request, 'reports/report_summary.html', {
        teams = Team.objects.all()
        
        'teams': teams,
        'total_teams': teams.count(),
        'teams_without_manager': teams.filter(manager__isnull=True),
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
    teams = Team.objects.all()

for t in teams:
    sheet.append([
        getattr(t, 'teamName', str(t)),
        getattr(t, 'manager', "No Manager") or "No Manager",
        getattr(t, 'department', "")
    ])
    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="Teams_Report.xlsx"'
    return response
