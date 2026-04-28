# Student 6: Data Visualization - Dashboard View Logic
from django.shortcuts import render
from django.db.models import Count
from django.contrib.auth.decorators import login_required
from team.models import Department, Team, Staff, Skill
from organisation.models import TeamDependency

# Maps department name → JS section key used in insights.html
DEPT_KEY = {
    'xTV_Web':          'xtv',
    'Native TVs':       'native',
    'Mobile':           'mobile',
    'Reliability_Tool': 'reliability',
    'Arch':             'arch',
    'Programme':        'programme',
}

@login_required
def visualization_dashboard(request):
    total_teams       = Team.objects.count()
    total_engineers   = Staff.objects.count()
    total_dependencies = TeamDependency.objects.count()
    teams_without_manager = Team.objects.filter(teamLeader__isnull=True).count()

    # Per-department aggregates
    departments = list(
        Department.objects
        .annotate(
            num_teams=Count('teams', distinct=True),
            num_staff=Count('staff_members', distinct=True),
        )
        .select_related('leader')
        .order_by('departmentName')
    )

    dept_names        = []
    dept_team_counts  = []
    dept_staff_counts = []
    dept_upstream     = []
    dept_downstream   = []
    dept_details      = {}

    for dept in departments:
        name = dept.departmentName
        dept_names.append(name)
        dept_team_counts.append(dept.num_teams)
        dept_staff_counts.append(dept.num_staff)

        up   = TeamDependency.objects.filter(team__department=dept, direction='UPSTREAM').count()
        down = TeamDependency.objects.filter(team__department=dept, direction='DOWNSTREAM').count()
        dept_upstream.append(up)
        dept_downstream.append(down)

        leader = dept.leader
        dept_details[DEPT_KEY.get(name, name)] = {
            'name':      name,
            'leader':    f"{leader.firstName} {leader.lastName}" if leader else 'Unassigned',
            'initials':  f"{leader.firstName[0]}{leader.lastName[0]}" if leader else '?',
            'num_teams': dept.num_teams,
            'num_staff': dept.num_staff,
            'upstream':  up,
            'downstream': down,
        }

    # Skill category counts for horizontal bar chart
    skill_cats = list(
        Skill.objects
        .values('skillCategory')
        .annotate(count=Count('pk'))
        .order_by('-count')[:10]
    )
    skill_cat_labels = [s['skillCategory'] for s in skill_cats]
    skill_cat_counts = [s['count'] for s in skill_cats]

    # Dependency-type breakdown for donut chart
    dep_types = list(
        TeamDependency.objects
        .values('dependency_type__name')
        .annotate(count=Count('pk'))
        .order_by('-count')
    )
    dep_type_labels = [d['dependency_type__name'] or 'Unclassified' for d in dep_types]
    dep_type_counts = [d['count'] for d in dep_types]

    context = {
        'total_teams':            total_teams,
        'total_engineers':        total_engineers,
        'total_dependencies':     total_dependencies,
        'teams_without_manager':  teams_without_manager,
        'has_manager_count':      total_teams - teams_without_manager,
        # chart data (passed via json_script in template)
        'dept_names':        dept_names,
        'dept_team_counts':  dept_team_counts,
        'dept_staff_counts': dept_staff_counts,
        'dept_upstream':     dept_upstream,
        'dept_downstream':   dept_downstream,
        'dep_type_labels':   dep_type_labels,
        'dep_type_counts':   dep_type_counts,
        'dept_details':      dept_details,
        'skill_cat_labels':  skill_cat_labels,
        'skill_cat_counts':  skill_cat_counts,
    }

    return render(request, 'graphs/insights.html', context)