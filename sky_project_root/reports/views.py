from django.shortcuts import render
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from team.models import Team, Department
import pandas as pd
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4


@login_required
def dashboard(request):
    """
    Main Reports Dashboard view.
    Fetches all team and department data and passes summary statistics
    to the reports_dashboard.html template for display.
    Requires the user to be logged in via @login_required.
    """

    # Fetch all teams from the database
    teams = Team.objects.all()

    # Filter teams that have no assigned team leader
    unmanaged = teams.filter(teamLeader__isnull=True)

    # Annotate each department with the number of teams it contains
    # Used to power the bar chart on the reports page
    departments = Department.objects.annotate(team_count=Count('teams'))

    # Get the department with the most teams — used to scale the bar chart correctly
    max_teams_obj = departments.order_by('-team_count').first()
    max_teams = max_teams_obj.team_count if max_teams_obj else 1

    # Find teams missing key profile data (skills or focus areas)
    # These are flagged as incomplete on the reports dashboard
    incomplete_teams = Team.objects.select_related('department', 'teamLeader').filter(
        Q(keySkills__isnull=True) | Q(keySkills='') |
        Q(developmentFocusAreas__isnull=True) | Q(developmentFocusAreas='')
    )

    # Build a summary dictionary for the metric cards at the top of the page
    summary = {
        "total_teams": teams.count(),
        "total_departments": departments.count(),
        "unmanaged_count": unmanaged.count(),
        "incomplete_count": incomplete_teams.count(),
    }

    # Render the dashboard template with all context data
    return render(
        request,
        "reports/reports_dashboard.html",
        {
            "summary": summary,
            "unmanaged": unmanaged,
            "departments": departments,
            "max_teams": max_teams,
            "incomplete_teams": incomplete_teams,
        },
    )


@login_required
def export_excel(request):
    """
    Generates and returns an Excel (.xlsx) file containing a summary of all teams.
    Uses pandas and openpyxl to build the spreadsheet in memory and return it
    as a downloadable HTTP response — no file is saved to disk.
    """

    # Fetch all teams with related department and leader data in a single query
    teams = Team.objects.select_related('department', 'teamLeader').all()

    # Build a list of rows — one per team — for the spreadsheet
    rows = []
    for team in teams:
        leader = team.teamLeader
        # Use full name if leader exists, otherwise show placeholder
        if leader:
            leader_name = f"{leader.firstName} {leader.lastName}"
        else:
            leader_name = "No Leader"

        rows.append({
            "Team Name": team.teamName,
            "Department": team.department.departmentName if team.department else "—",
            "Team Leader": leader_name,
        })

    # Convert rows list to a pandas DataFrame for easy Excel export
    df = pd.DataFrame(rows)

    # Write the DataFrame to an in-memory buffer as an Excel file
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Teams")

    # Return the Excel file as a downloadable HTTP response
    response = HttpResponse(
        output.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = 'attachment; filename="team_report.xlsx"'
    return response


@login_required
def export_pdf(request):
    """
    Generates and returns a styled PDF report of all engineering teams.
    Uses ReportLab to draw the PDF programmatically in memory.
    The PDF includes a branded header, summary stats, department breakdown,
    and a full team list — all styled with Sky's pink/purple colour scheme.
    No file is saved to disk; the PDF is streamed directly to the browser.
    """

    # Create an in-memory buffer and a ReportLab canvas to draw the PDF
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # --- Branded header banner (pink background) ---
    p.setFillColorRGB(0.92, 0.09, 0.49)
    p.rect(0, height - 120, width, 120, fill=True, stroke=False)

    # Header text — company name and report title
    p.setFillColorRGB(1, 1, 1)
    p.setFont("Helvetica-Bold", 28)
    p.drawString(50, height - 60, "Sky Engineering")
    p.setFont("Helvetica", 16)
    p.drawString(50, height - 85, "Team Summary Report")

    # Add today's date to the header
    from django.utils import timezone
    today = timezone.now().strftime("%d %B %Y")
    p.setFont("Helvetica", 11)
    p.drawString(50, height - 108, f"Generated: {today}")

    # Fetch all data needed for the PDF body
    teams = Team.objects.select_related('department', 'teamLeader').all()
    departments = Department.objects.all()
    unmanaged = teams.filter(teamLeader__isnull=True)

    p.setFillColorRGB(0, 0, 0)
    y = height - 180  # Track vertical position as we draw down the page

    # --- Summary section ---
    p.setFont("Helvetica-Bold", 14)
    p.drawString(50, y, "Summary")
    y -= 25

    # Light grey background box for summary stats
    p.setFillColorRGB(0.97, 0.97, 0.97)
    p.rect(50, y - 80, width - 100, 90, fill=True, stroke=False)
    p.setFillColorRGB(0, 0, 0)

    # Draw each summary stat as a label/value pair
    p.setFont("Helvetica-Bold", 12)
    p.drawString(70, y - 20, "Total Teams:")
    p.setFont("Helvetica", 12)
    p.drawString(250, y - 20, str(teams.count()))

    p.setFont("Helvetica-Bold", 12)
    p.drawString(70, y - 40, "Total Departments:")
    p.setFont("Helvetica", 12)
    p.drawString(250, y - 40, str(departments.count()))

    p.setFont("Helvetica-Bold", 12)
    p.drawString(70, y - 60, "Teams Without Leaders:")
    p.setFont("Helvetica", 12)
    p.drawString(250, y - 60, str(unmanaged.count()))

    y -= 110

    # --- Teams by Department section ---
    p.setFont("Helvetica-Bold", 14)
    p.drawString(50, y, "Teams by Department")
    y -= 25

    # Pink table header row
    p.setFillColorRGB(0.92, 0.09, 0.49)
    p.rect(50, y - 5, width - 100, 20, fill=True, stroke=False)
    p.setFillColorRGB(1, 1, 1)
    p.setFont("Helvetica-Bold", 11)
    p.drawString(60, y, "Department")
    p.drawString(350, y, "No. of Teams")
    y -= 20

    # Draw one row per department with alternating grey background
    p.setFillColorRGB(0, 0, 0)
    row = 0
    for dept in departments:
        # Start a new page if we're near the bottom
        if y < 80:
            p.showPage()
            y = height - 80
        if row % 2 == 0:
            p.setFillColorRGB(0.97, 0.97, 0.97)
            p.rect(50, y - 5, width - 100, 18, fill=True, stroke=False)
        p.setFillColorRGB(0, 0, 0)
        p.setFont("Helvetica", 11)
        p.drawString(60, y, dept.departmentName)
        p.drawString(350, y, str(dept.teams.count()))
        y -= 20
        row += 1

    y -= 20

    # Start a new page if not enough space for the full team list header
    if y < 150:
        p.showPage()
        y = height - 80

    # --- Full Team List section ---
    p.setFont("Helvetica-Bold", 14)
    p.drawString(50, y, "Full Team List")
    y -= 25

    # Pink table header row
    p.setFillColorRGB(0.92, 0.09, 0.49)
    p.rect(50, y - 5, width - 100, 20, fill=True, stroke=False)
    p.setFillColorRGB(1, 1, 1)
    p.setFont("Helvetica-Bold", 11)
    p.drawString(60, y, "Team Name")
    p.drawString(250, y, "Department")
    p.drawString(420, y, "Team Leader")
    y -= 20

    # Draw one row per team with alternating grey rows
    p.setFillColorRGB(0, 0, 0)
    row = 0
    for team in teams:
        # Paginate if near the bottom of the page
        if y < 80:
            p.showPage()
            p.setFont("Helvetica", 10)
            y = height - 80
        if row % 2 == 0:
            p.setFillColorRGB(0.97, 0.97, 0.97)
            p.rect(50, y - 5, width - 100, 18, fill=True, stroke=False)
        p.setFillColorRGB(0, 0, 0)
        p.setFont("Helvetica", 10)
        leader = team.teamLeader
        # Truncate long strings to prevent overflow off the page
        leader_name = f"{leader.firstName} {leader.lastName}" if leader else "No Leader"
        p.drawString(60, y, team.teamName[:30])
        p.drawString(250, y, team.department.departmentName[:25] if team.department else "—")
        p.drawString(420, y, leader_name[:25])
        y -= 18
        row += 1

    # --- Footer on final page ---
    p.setFillColorRGB(0.92, 0.09, 0.49)
    p.rect(0, 0, width, 30, fill=True, stroke=False)
    p.setFillColorRGB(1, 1, 1)
    p.setFont("Helvetica", 9)
    p.drawString(50, 10, f"Sky Engineering Team Directory © 2026 | Generated {today}")

    # Finalise the PDF and write to buffer
    p.showPage()
    p.save()

    # Return the PDF as a downloadable HTTP response
    pdf = buffer.getvalue()
    buffer.close()

    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="team_report.pdf"'
    return response