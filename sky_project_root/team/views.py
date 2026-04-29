from django.db.models import Q
from django.shortcuts import get_object_or_404, render

from .models import Department, Team


def team_list(request):
    """List + search teams.

    Query params:
      - q: free-text search across name, leader, department, skills
      - dept: department id to filter by
    """
    q = request.GET.get("q", "").strip()
    dept_id = request.GET.get("dept", "").strip()

    teams = (
        Team.objects.select_related("department")
        .prefetch_related("skills", "members")
        .all()
    )

    if dept_id:
        teams = teams.filter(department_id=dept_id)

    if q:
        teams = teams.filter(
            Q(name__icontains=q)
            | Q(leader_name__icontains=q)
            | Q(department__name__icontains=q)
            | Q(skills__name__icontains=q)
            | Q(email__icontains=q)
        ).distinct()

    departments = Department.objects.all()
    total = Team.objects.count()

    return render(
        request,
        "team/team_list.html",
        {
            "teams": teams,
            "departments": departments,
            "q": q,
            "active_dept_id": int(dept_id) if dept_id.isdigit() else None,
            "total": total,
        },
    )


def team_detail(request, slug):
    team = get_object_or_404(
        Team.objects.select_related("department").prefetch_related(
            "skills", "members", "dependencies", "dependents"
        ),
        slug=slug,
    )
    return render(request, "team/TeamDetail.html", {"team": team})
