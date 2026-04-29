from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from team.models import Team, Department, Staff
from .models import Activity 

@login_required
def dashboard(request):
    # 1. Total Counts (These work fine)
    total_teams = Team.objects.count()
    total_departments = Department.objects.count()
    total_engineers = Staff.objects.count()
    
    # 2. Dynamic Metric Sub-labels
    # We set these to 0 for now because your Team/Staff models 
    # are missing date-tracking fields (like created_at)
    new_teams_count = 0
    new_engineers_count = 0

    # 3. Message Count
    unread_count = 0 

    # 4. Recent Activity Feed
    raw_activities = Activity.objects.select_related('actor').order_by('-timestamp')[:5]
    activities = []
    colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#f97316', '#10b981']
    
    for i, act in enumerate(raw_activities):
        actor_name = act.actor.get_full_name() or act.actor.username if act.actor else "System"
        activities.append({
            'initials': act.initials or "SY",
            'actor': actor_name,
            'action': act.action,
            'time': act.timestamp.strftime('%H:%M'), 
            'color': colors[i % len(colors)]
        })

    # 5. Data for Chart
    departments = Department.objects.prefetch_related('teams').all()

    context = {
        'total_teams': total_teams,
        'new_teams_count': new_teams_count,
        'total_departments': total_departments,
        'total_engineers': total_engineers,
        'new_engineers_count': new_engineers_count,
        'unread_count': unread_count,
        'departments': departments,
        'activities': activities,
    }
    
    return render(request, 'dashboard/dashboard.html', context)