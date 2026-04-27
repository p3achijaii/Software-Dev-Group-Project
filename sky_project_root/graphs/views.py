# Student 6: Data Visualization - Dashboard View Logic
from django.shortcuts import render
from django.db.models import Count, Prefetch
from django.contrib.auth.decorators import login_required
from team.models import Department, Team, Staff, TeamMember
from organisation.models import TeamDependency

@login_required
def visualization_dashboard(request):
    # --- Metric Cards ---
    total_teams = Team.objects.count()
    total_engineers = Staff.objects.count()
    total_dependencies = TeamDependency.objects.count()
    teams_without_manager = Team.objects.filter(teamLeader__isnull=True).count()

    # --- Per-department arrays (same index across all lists) ---
    departments = list(
        Department.objects.annotate(
            num_teams=Count('teams', distinct=True)
        ).select_related('leader')
    )

    dept_names = []
    dept_team_counts = []
    dept_avg_sizes = []
    dept_heads = []
    dept_upstream = []
    dept_downstream = []

    for dept in departments:
        dept_names.append(dept.departmentName)
        dept_team_counts.append(dept.num_teams)

        leader = dept.leader
        dept_heads.append(
            f"{leader.firstName} {leader.lastName}" if leader else 'Unassigned'
        )

        member_count = TeamMember.objects.filter(team__department=dept).count()
        avg = round(member_count / dept.num_teams, 1) if dept.num_teams > 0 else 0
        dept_avg_sizes.append(avg)

        dept_upstream.append(
            TeamDependency.objects.filter(team__department=dept).count()
        )
        dept_downstream.append(
            TeamDependency.objects.filter(depends_on__department=dept).count()
        )

    # --- Teams without manager pie ---
    has_manager_count = total_teams - teams_without_manager

    # --- Dependency table (grouped by source team) ---
    teams_with_deps = (
        Team.objects
        .filter(dependencies__isnull=False)
        .select_related('department', 'teamLeader')
        .prefetch_related(
            Prefetch(
                'dependencies',
                queryset=TeamDependency.objects.select_related('depends_on', 'dependency_type')
            )
        )
        .distinct()
    )

    deps_table = []
    for team in teams_with_deps:
        type_names = set()
        linked = []
        for dep in team.dependencies.all():
            if dep.dependency_type:
                type_names.add(dep.dependency_type.name.lower())
            linked.append(dep.depends_on.teamName)

        if 'upstream' in type_names and 'downstream' in type_names:
            badge = 'both'
        elif type_names:
            badge = next(iter(type_names))
        else:
            badge = 'unclassified'

        deps_table.append({
            'team': team.teamName,
            'department': team.department.departmentName,
            'manager': (
                f"{team.teamLeader.firstName} {team.teamLeader.lastName}"
                if team.teamLeader else 'Unassigned'
            ),
            'dep_type': badge,
            'linked_teams': ', '.join(linked),
        })

    context = {
        'total_teams': total_teams,
        'total_engineers': total_engineers,
        'total_dependencies': total_dependencies,
        'teams_without_manager': teams_without_manager,
        'has_manager_count': has_manager_count,
        'dept_names': dept_names,
        'dept_team_counts': dept_team_counts,
        'dept_avg_sizes': dept_avg_sizes,
        'dept_heads': dept_heads,
        'dept_upstream': dept_upstream,
        'dept_downstream': dept_downstream,
        'deps_table': deps_table,
    }

    return render(request, 'graphs/insights.html', context)