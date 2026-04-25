from django.shortcuts import render
from team.models import Department
from .models import TeamDependency


def organisation_view(request):
    departments = Department.objects.all()
    dependencies = TeamDependency.objects.all()

    context = {
        'departments': departments,
        'dependencies': dependencies,
    }

    return render(request, 'organisation/organisation.html', context)
