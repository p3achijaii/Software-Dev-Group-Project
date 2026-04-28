from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from datetime import timedelta

from .models import Meeting
from .forms import MeetingForm


@login_required
def meetings_home(request):
    meetings = Meeting.objects.filter(
        date_time__gte=timezone.now()
    ).order_by('date_time')

    return render(request, "meetings.html", {'meetings': meetings})


@login_required
def schedule_meeting(request):
    if request.method == "POST":
        form = MeetingForm(request.POST)
        if form.is_valid():
            meeting = form.save(commit=False)
            meeting.organiser = request.user
            meeting.save()
            return redirect('meetings_home')
    else:
        form = MeetingForm()

    return render(request, "schedule/schedule_form.html", {'form': form})


@login_required
def weekly_view(request):
    today = timezone.now().date()
    end_week = today + timedelta(days=7)

    meetings = Meeting.objects.filter(
        date_time__date__range=[today, end_week]
    )

    return render(request, "schedule/weekly.html", {'meetings': meetings})


@login_required
def monthly_view(request):
    now = timezone.now()
    meetings = Meeting.objects.filter(
        date_time__month=now.month,
        date_time__year=now.year
    )

    return render(request, "schedule/monthly.html", {
        'meetings': meetings,
        'month': now.month,
        'year': now.year
    })

# Create your views here.
