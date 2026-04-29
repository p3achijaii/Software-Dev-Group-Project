from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from datetime import timedelta

from .models import Meeting
from .forms import MeetingForm


@login_required
def meetings_home(request):
    """
    Main Meetings page.
    Supports filtering via URL query params:
    ?filter=upcoming
    ?filter=past
    """

    filter_type = request.GET.get('filter')
    now = timezone.now()

    if filter_type == 'upcoming':
        meetings = Meeting.objects.filter(date_time__gte=now)
    elif filter_type == 'past':
        meetings = Meeting.objects.filter(date_time__lt=now)
    else:
        meetings = Meeting.objects.all()

    meetings = meetings.order_by('date_time')

    return render(request, "meetings.html", {
        'meetings': meetings,
        'active_filter': filter_type or 'all'
    })


@login_required
def schedule_meeting(request):
    """
    Form view for scheduling a new meeting
    """

    if request.method == "POST":
        form = MeetingForm(request.POST)
        if form.is_valid():
            meeting = form.save(commit=False)
            meeting.organiser = request.user
            meeting.save()
            return redirect('meetings_home')
    else:
        form = MeetingForm()

    return render(request, "schedule/schedule_form.html", {
        'form': form
    })


@login_required
def weekly_view(request):
    """
    Weekly meetings view (next 7 days)
    """

    today = timezone.now().date()
    end_week = today + timedelta(days=7)

    meetings = Meeting.objects.filter(
        date_time__date__range=[today, end_week]
    ).order_by('date_time')

    return render(request, "schedule/weekly.html", {
        'meetings': meetings
    })


@login_required
def monthly_view(request):
    """
    Monthly meetings view (current month)
    """

    now = timezone.now()

    meetings = Meeting.objects.filter(
        date_time__year=now.year,
        date_time__month=now.month
    ).order_by('date_time')

    return render(request, "schedule/monthly.html", {
        'meetings': meetings,
        'month': now.month,
        'year': now.year
    })
