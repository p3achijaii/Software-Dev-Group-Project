from django.db.models import Q
from django.shortcuts import get_object_or_404, render
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from .models import Department, Team

def team_list(request):
    """
    Displays a list of teams with filtering, search, and pagination (10 per page).
    """
    q = request.GET.get("q", "").strip()
    dept_id = request.GET.get("dept", "").strip()
    page_number = request.GET.get("page", 1)
    
    # Base queryset with optimized lookups
    teams_queryset = (
        Team.objects
        .select_related("department", "teamLeader")
        .prefetch_related("members__staff")
        .all()
        .order_by('teamName')  # Pagination works best with a consistent order
    )
    
    # Filter by department if a dept ID is provided
    if dept_id:
        teams_queryset = teams_queryset.filter(department_id=dept_id)
    
    # Search logic: checks name, leader name, and department
    if q:
        teams_queryset = teams_queryset.filter(
            Q(teamName__icontains=q) |
            Q(teamLeader__firstName__icontains=q) |
            Q(teamLeader__lastName__icontains=q) |
            Q(department__departmentName__icontains=q)
        ).distinct()
        
    # --- Pagination Logic ---
    paginator = Paginator(teams_queryset, 10)  # Show 10 teams per page
    
    try:
        teams = paginator.page(page_number)
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        teams = paginator.page(1)
    except EmptyPage:
        # If page is out of range, deliver last page of results.
        teams = paginator.page(paginator.num_pages)
        
    departments = Department.objects.all()
    total = teams_queryset.count() 
    
    return render(
        request,
        "team/team_list.html",
        {
            "teams": teams,            # This is now a Page object
            "departments": departments,
            "q": q,
            "active_dept_id": int(dept_id) if dept_id.isdigit() else None,
            "total": total,
        },
    )

@login_required
def team_detail(request, slug):
    """
    Fetches a specific team using the slug and pulls related data.
    """
    team = get_object_or_404(
        Team.objects
            .select_related("department__leader", "teamLeader")
            .prefetch_related(
                "members__staff",
                "developmentFocus",
                "team_skills__skill", 
                "dependencies__depends_on__department",
                "dependencies__dependency_type",
            ),
        slug=slug,
    )
    
    skills = team.team_skills.all()
    
    return render(request, "team/TeamDetail.html", {
        "team": team,
        "skills": skills
    })