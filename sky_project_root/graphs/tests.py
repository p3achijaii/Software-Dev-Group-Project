from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from django.core.management import call_command

from team.models import Department, Staff, Team, TeamMember
from organisation.models import DependencyType, TeamDependency


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_dept(name='Engineering'):
    dept = Department.objects.create(departmentName=name)
    leader = Staff.objects.create(
        firstName='Test', lastName='Leader',
        emailAddress=f'leader.{name.lower()}@sky.com',
        department=dept,
    )
    dept.leader = leader
    dept.save()
    return dept, leader


def make_team(name, dept, leader):
    return Team.objects.create(teamName=name, department=dept, teamLeader=leader)


# ---------------------------------------------------------------------------
# View tests
# ---------------------------------------------------------------------------

class DashboardAccessTests(TestCase):

    def setUp(self):
        self.url = reverse('dashboard')
        self.user = User.objects.create_user(username='tester', password='pass1234')
        dept, leader = make_dept()
        make_team('Alpha', dept, leader)

    def test_redirects_when_not_logged_in(self):
        """Unauthenticated request must be redirected (login_required)."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)

    def test_returns_200_when_logged_in(self):
        """Authenticated request must return HTTP 200."""
        self.client.login(username='tester', password='pass1234')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_uses_correct_template(self):
        self.client.login(username='tester', password='pass1234')
        response = self.client.get(self.url)
        self.assertTemplateUsed(response, 'graphs/graphs.html')


class DashboardContextTests(TestCase):

    def setUp(self):
        self.client.force_login(
            User.objects.create_user(username='tester', password='pass1234')
        )
        self.dept, self.leader = make_dept('Platform')
        self.team = make_team('CDN Ops', self.dept, self.leader)

    def test_all_context_keys_present(self):
        """Every key the template relies on must be in the context."""
        response = self.client.get(reverse('dashboard'))
        required = [
            'total_teams', 'total_engineers', 'total_dependencies',
            'teams_without_manager', 'has_manager_count',
            'dept_names', 'dept_team_counts', 'dept_avg_sizes',
            'dept_heads', 'dept_upstream', 'dept_downstream',
            'deps_table',
        ]
        for key in required:
            self.assertIn(key, response.context, msg=f'Missing context key: {key}')

    def test_metric_totals_match_database(self):
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.context['total_teams'], Team.objects.count())
        self.assertEqual(response.context['total_engineers'], Staff.objects.count())
        self.assertEqual(
            response.context['total_dependencies'], TeamDependency.objects.count()
        )

    def test_dept_names_contains_created_department(self):
        response = self.client.get(reverse('dashboard'))
        self.assertIn('Platform', response.context['dept_names'])

    def test_dept_arrays_same_length(self):
        """All per-department arrays must be the same length (same index = same dept)."""
        response = self.client.get(reverse('dashboard'))
        ctx = response.context
        length = len(ctx['dept_names'])
        self.assertEqual(len(ctx['dept_team_counts']), length)
        self.assertEqual(len(ctx['dept_avg_sizes']),   length)
        self.assertEqual(len(ctx['dept_heads']),        length)
        self.assertEqual(len(ctx['dept_upstream']),     length)
        self.assertEqual(len(ctx['dept_downstream']),   length)

    def test_team_count_per_department_is_correct(self):
        # Platform dept has exactly 1 team
        response = self.client.get(reverse('dashboard'))
        ctx = response.context
        idx = ctx['dept_names'].index('Platform')
        self.assertEqual(ctx['dept_team_counts'][idx], 1)

    def test_has_manager_plus_no_manager_equals_total(self):
        response = self.client.get(reverse('dashboard'))
        ctx = response.context
        self.assertEqual(
            ctx['has_manager_count'] + ctx['teams_without_manager'],
            ctx['total_teams'],
        )


class DashboardDependencyTableTests(TestCase):

    def setUp(self):
        self.client.force_login(
            User.objects.create_user(username='tester', password='pass1234')
        )
        dept_a, leader_a = make_dept('Global Apps')
        dept_b, leader_b = make_dept('Security')
        self.team_a = make_team('Streaming Core', dept_a, leader_a)
        self.team_b = make_team('Threat Intel',   dept_b, leader_b)
        self.dep_type = DependencyType.objects.create(name='Downstream')
        TeamDependency.objects.create(
            team=self.team_a,
            depends_on=self.team_b,
            dependency_type=self.dep_type,
        )

    def test_dependency_row_appears_in_table(self):
        response = self.client.get(reverse('dashboard'))
        table = response.context['deps_table']
        teams_in_table = [row['team'] for row in table]
        self.assertIn('Streaming Core', teams_in_table)

    def test_dependency_row_has_correct_linked_team(self):
        response = self.client.get(reverse('dashboard'))
        row = next(r for r in response.context['deps_table'] if r['team'] == 'Streaming Core')
        self.assertEqual(row['linked_teams'], 'Threat Intel')

    def test_dependency_badge_type(self):
        response = self.client.get(reverse('dashboard'))
        row = next(r for r in response.context['deps_table'] if r['team'] == 'Streaming Core')
        self.assertEqual(row['dep_type'], 'downstream')

    def test_both_badge_when_upstream_and_downstream_exist(self):
        up_type = DependencyType.objects.create(name='Upstream')
        dept_c, leader_c = make_dept('Platform')
        team_c = make_team('Auth', dept_c, leader_c)
        TeamDependency.objects.create(
            team=self.team_a, depends_on=team_c, dependency_type=up_type
        )
        response = self.client.get(reverse('dashboard'))
        row = next(r for r in response.context['deps_table'] if r['team'] == 'Streaming Core')
        self.assertEqual(row['dep_type'], 'both')


# ---------------------------------------------------------------------------
# Seed command tests
# ---------------------------------------------------------------------------

class SeedCommandTests(TestCase):

    def test_seed_creates_correct_department_count(self):
        call_command('seed_data', verbosity=0)
        self.assertEqual(Department.objects.count(), 6)

    def test_seed_creates_correct_team_count(self):
        call_command('seed_data', verbosity=0)
        self.assertEqual(Team.objects.count(), 46)

    def test_seed_creates_five_members_per_team(self):
        call_command('seed_data', verbosity=0)
        self.assertEqual(TeamMember.objects.count(), 46 * 5)

    def test_seed_creates_dependencies(self):
        call_command('seed_data', verbosity=0)
        self.assertGreater(TeamDependency.objects.count(), 50)

    def test_seed_sets_department_leaders(self):
        call_command('seed_data', verbosity=0)
        depts_without_leader = Department.objects.filter(leader__isnull=True).count()
        self.assertEqual(depts_without_leader, 0)

    def test_seed_is_idempotent(self):
        """Running seed twice should give the same counts (clears first)."""
        call_command('seed_data', verbosity=0)
        first = Team.objects.count()
        call_command('seed_data', verbosity=0)
        self.assertEqual(Team.objects.count(), first)
