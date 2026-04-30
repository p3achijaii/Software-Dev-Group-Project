import calendar
from datetime import date, timedelta

from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from .forms import MeetingForm
from .models import Meeting


# ── Helpers ──────────────────────────────────────────────

def _month_calendar_data(year, month, meetings_qs):
    today = date.today()
    cal = calendar.monthcalendar(year, month)

    by_day = {}
    for m in meetings_qs.filter(date_time__year=year, date_time__month=month):
        by_day.setdefault(m.date_time.day, []).append(m)

    leading = []
    days = []
    blank_done = False
    for week in cal:
        for d in week:
            if d == 0 and not blank_done:
                leading.append(None)
            else:
                blank_done = True
                if d != 0:
                    days.append({
                        'day': d,
                        'is_today': (year == today.year and month == today.month and d == today.day),
                        'meetings': by_day.get(d, []),
                    })
    return leading, days


def _week_data(week_offset, meetings_qs):
    today = date.today()
    week_start = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
    week_end   = week_start + timedelta(days=6)

    by_date = {}
    for m in meetings_qs.filter(date_time__date__gte=week_start, date_time__date__lte=week_end):
        by_date.setdefault(m.date_time.date(), []).append(m)

    names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    week_days = [
        {
            'name': names[i],
            'date': (week_start + timedelta(days=i)).day,
            'is_today': (week_start + timedelta(days=i)) == today,
            'meetings': by_date.get(week_start + timedelta(days=i), []),
        }
        for i in range(7)
    ]
    return week_start, week_end, week_days


def _shared_context(meetings_qs, week_offset=0):
    now   = timezone.now()
    today = date.today()
    week_start = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
    week_end   = week_start + timedelta(days=6)
    upcoming   = meetings_qs.filter(date_time__gte=now)

    return {
        'upcoming_meetings': upcoming.order_by('date_time'),
        'upcoming_count':    upcoming.count(),
        'past_count':        meetings_qs.filter(date_time__lt=now).count(),
        'now':               now,
        'summary': {
            'upcoming_count':   upcoming.count(),
            'this_week_count':  meetings_qs.filter(
                date_time__date__gte=week_start,
                date_time__date__lte=week_end,
            ).count(),
            'this_month_count': meetings_qs.filter(
                date_time__year=today.year,
                date_time__month=today.month,
            ).count(),
            'teams_involved': meetings_qs.filter(
                date_time__year=today.year,
                date_time__month=today.month,
            ).values('team').distinct().count(),
        },
    }


# ── Views ────────────────────────────────────────────────

@login_required
def meetings_home(request):
    now = timezone.now()
    qs  = Meeting.objects.select_related('team', 'organiser')

    filter_type = request.GET.get('filter', 'all')
    if filter_type == 'upcoming':
        meetings = qs.filter(date_time__gte=now)
    elif filter_type == 'past':
        meetings = qs.filter(date_time__lt=now)
    else:
        meetings = qs.all()

    ctx = _shared_context(qs)
    ctx.update({
        'meetings':      meetings.order_by('date_time'),
        'active_filter': filter_type,
    })
    return render(request, 'schedule/calendar.html', ctx)


@login_required
def weekly_view(request):
    qs = Meeting.objects.select_related('team', 'organiser')
    try:
        week_offset = int(request.GET.get('week_offset', 0))
    except ValueError:
        week_offset = 0

    week_start, week_end, week_days = _week_data(week_offset, qs)

    ctx = _shared_context(qs, week_offset)
    ctx.update({
        'week_days':        week_days,
        'week_start_label': week_start.strftime('%-d %b'),
        'week_end_label':   week_end.strftime('%-d %b %Y'),
        'prev_week_offset': week_offset - 1,
        'next_week_offset': week_offset + 1,
        'week_offset':      week_offset,
        'active_filter':    '',
    })
    return render(request, 'schedule/calendar.html', ctx)


@login_required
def monthly_view(request):
    today = date.today()
    qs    = Meeting.objects.select_related('team', 'organiser')

    try:
        month = int(request.GET.get('month', today.month))
        year  = int(request.GET.get('year',  today.year))
    except ValueError:
        month, year = today.month, today.year

    if month < 1:    month, year = 12, year - 1
    elif month > 12: month, year = 1,  year + 1

    leading_blanks, calendar_days = _month_calendar_data(year, month, qs)

    ctx = _shared_context(qs)
    ctx.update({
        'calendar_days':  calendar_days,
        'leading_blanks': leading_blanks,
        'day_headers':    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        'month_name':     calendar.month_name[month],
        'current_month':  month,
        'current_year':   year,
        'prev_month':     month - 1 if month > 1 else 12,
        'prev_year':      year      if month > 1 else year - 1,
        'next_month':     month + 1 if month < 12 else 1,
        'next_year':      year      if month < 12 else year + 1,
        'today_month':    today.month,
        'today_year':     today.year,
        'active_filter':  '',
    })
    return render(request, 'schedule/calendar.html', ctx)


@login_required
def schedule_meeting(request):
    if request.method == 'POST':
        form = MeetingForm(request.POST)
        if form.is_valid():
            meeting = form.save(commit=False)
            meeting.organiser = request.user
            meeting.save()
            return redirect('meetings_home')
    else:
        form = MeetingForm()
    return render(request, 'schedule/schedule_form.html', {'form': form})


@login_required
def edit_meeting(request, meeting_id):
    meeting = get_object_or_404(Meeting, id=meeting_id)
    if request.method == 'POST':
        form = MeetingForm(request.POST, instance=meeting)
        if form.is_valid():
            form.save()
            return redirect('meetings_home')
    else:
        form = MeetingForm(instance=meeting)
    return render(request, 'schedule/edit_meeting.html', {'form': form, 'meeting': meeting})


@login_required
def delete_meeting(request, meeting_id):
    meeting = get_object_or_404(Meeting, id=meeting_id)
    meeting.delete()
    return redirect('meetings_home')
