from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import login as auth_login
from django.contrib import messages as notify
from django.utils import timezone
from team.models import Department, Team, Staff
from schedule.models import Meeting


def register_view(request):
    if request.user.is_authenticated:
        return redirect('/dashboard/')

    error = None
    if request.method == 'POST':
        full_name  = request.POST.get('full_name', '').strip()
        username   = request.POST.get('username', '').strip()
        email      = request.POST.get('email', '').strip()
        password1  = request.POST.get('password1', '')
        password2  = request.POST.get('password2', '')

        if not all([full_name, username, email, password1]):
            error = 'All fields are required.'
        elif password1 != password2:
            error = 'Passwords do not match.'
        elif len(password1) < 8:
            error = 'Password must be at least 8 characters.'
        elif User.objects.filter(username=username).exists():
            error = 'That username is already taken.'
        elif User.objects.filter(email=email).exists():
            error = 'An account with that email already exists.'
        else:
            parts      = full_name.split(' ', 1)
            first_name = parts[0]
            last_name  = parts[1] if len(parts) > 1 else ''
            user = User.objects.create_user(
                username=username, email=email, password=password1,
                first_name=first_name, last_name=last_name,
            )
            auth_login(request, user, backend='graphs.auth_backends.EmailOrUsernameBackend')
            return redirect('/dashboard/')

    return render(request, 'registration/register.html', {'error': error})


@login_required
def profile_view(request):
    user  = request.user
    staff = Staff.objects.select_related('department').filter(emailAddress=user.email).first()
    departments = Department.objects.order_by('departmentName')

    now = timezone.now()
    meetings_count   = Meeting.objects.filter(organiser=user).count()
    upcoming_count   = Meeting.objects.filter(organiser=user, date_time__gte=now).count()
    recent_meetings  = Meeting.objects.filter(organiser=user).select_related('team').order_by('-date_time')[:4]
    dept_teams_count = Team.objects.filter(department=staff.department).count() if staff else 0
    account_months   = max(1, (now - user.date_joined).days // 30)

    first    = user.first_name or user.username
    last     = user.last_name or ''
    initials = ((first[0] + last[0]) if last else first[:2]).upper()

    return render(request, 'graphs/profile.html', {
        'staff':           staff,
        'departments':     departments,
        'meetings_count':  meetings_count,
        'upcoming_count':  upcoming_count,
        'recent_meetings': recent_meetings,
        'dept_teams':      dept_teams_count,
        'account_months':  account_months,
        'initials':        initials,
    })


@login_required
def profile_update(request):
    if request.method != 'POST':
        return redirect('profile')

    user   = request.user
    action = request.POST.get('action')

    if action == 'update_details':
        user.first_name = request.POST.get('first_name', '').strip()
        user.last_name  = request.POST.get('last_name', '').strip()
        new_email       = request.POST.get('email', '').strip()

        if new_email and new_email != user.email:
            Staff.objects.filter(emailAddress=user.email).update(emailAddress=new_email)
            user.email = new_email

        user.save()

        dept_id = request.POST.get('department', '').strip()
        if dept_id:
            staff = Staff.objects.filter(emailAddress=user.email).first()
            if staff:
                try:
                    staff.department = Department.objects.get(pk=dept_id)
                    staff.save()
                except Department.DoesNotExist:
                    pass

        notify.success(request, 'Profile updated.')

    elif action == 'change_password':
        from django.contrib.auth import update_session_auth_hash
        current    = request.POST.get('current_password', '')
        new_pw     = request.POST.get('new_password', '')
        confirm_pw = request.POST.get('confirm_password', '')

        if not user.check_password(current):
            notify.error(request, 'Current password is incorrect.')
        elif new_pw != confirm_pw:
            notify.error(request, 'New passwords do not match.')
        elif len(new_pw) < 8:
            notify.error(request, 'Password must be at least 8 characters.')
        else:
            user.set_password(new_pw)
            user.save()
            update_session_auth_hash(request, user)
            notify.success(request, 'Password updated successfully.')

    return redirect('profile')