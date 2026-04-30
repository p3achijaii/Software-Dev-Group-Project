from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from team.models import Team, Department, Staff

User = get_user_model()


class ReportsDashboardTest(TestCase):
    """Tests for the Reports dashboard page"""

    def setUp(self):
        """Set up test data before each test runs"""
        self.client = Client()

        # Create a test user to log in with
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

        # Create a test department
        self.department = Department.objects.create(
            departmentName='Test Department'
        )

        # Create a Staff instance to use as team leader
        self.leader = Staff.objects.create(
            firstName='John',
            lastName='Doe',
            emailAddress='john@sky.com',
            department=self.department
        )

        # Create a second Staff instance for the incomplete team
        self.leader2 = Staff.objects.create(
            firstName='Jane',
            lastName='Smith',
            emailAddress='jane@sky.com',
            department=self.department
        )

        # Create a complete team with a leader and skills
        self.team = Team.objects.create(
            teamName='Test Team',
            department=self.department,
            teamLeader=self.leader,
            keySkills='Python, Django',
            developmentFocusAreas='Backend Development'
        )

        # Create a team missing skills to test incomplete detection
        # teamLeader is required so we use leader2 but leave skills empty
        self.incomplete_team = Team.objects.create(
            teamName='Incomplete Team',
            department=self.department,
            teamLeader=self.leader2,
            keySkills='',
            developmentFocusAreas=''
        )

    def test_dashboard_redirects_if_not_logged_in(self):
        """Reports page should redirect to login if user is not authenticated"""
        response = self.client.get(reverse('reports:dashboard'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/accounts/', response.url)

    def test_dashboard_loads_when_logged_in(self):
        """Reports page should return 200 OK when user is logged in"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('reports:dashboard'))
        self.assertEqual(response.status_code, 200)

    def test_dashboard_uses_correct_template(self):
        """Reports page should render the reports_dashboard.html template"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('reports:dashboard'))
        self.assertTemplateUsed(response, 'reports/reports_dashboard.html')

    def test_dashboard_shows_correct_team_count(self):
        """Summary should show the correct total number of teams"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('reports:dashboard'))
        self.assertEqual(response.context['summary']['total_teams'], 2)

    def test_dashboard_detects_incomplete_teams(self):
        """Summary should correctly count teams missing skills or focus areas"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('reports:dashboard'))
        self.assertEqual(response.context['summary']['incomplete_count'], 1)

    def test_dashboard_shows_correct_department_count(self):
        """Summary should show the correct number of departments"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('reports:dashboard'))
        self.assertEqual(response.context['summary']['total_departments'], 1)


class ReportsExportTest(TestCase):
    """Tests for PDF and Excel export functionality"""

    def setUp(self):
        """Set up test user and data"""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.department = Department.objects.create(
            departmentName='Engineering'
        )
        self.leader = Staff.objects.create(
            firstName='Jane',
            lastName='Smith',
            emailAddress='jane@sky.com',
            department=self.department
        )
        self.team = Team.objects.create(
            teamName='Export Test Team',
            department=self.department,
            teamLeader=self.leader
        )

    def test_excel_export_returns_200(self):
        """Excel export should return a 200 response when logged in"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('reports:export_excel'))
        self.assertEqual(response.status_code, 200)

    def test_excel_export_correct_content_type(self):
        """Excel export should return the correct Excel MIME type"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('reports:export_excel'))
        self.assertIn('spreadsheetml', response['Content-Type'])

    def test_excel_export_has_attachment_header(self):
        """Excel export response should include a Content-Disposition header"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('reports:export_excel'))
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn('team_report.xlsx', response['Content-Disposition'])

    def test_pdf_export_returns_200(self):
        """PDF export should return a 200 response when logged in"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('reports:export_pdf'))
        self.assertEqual(response.status_code, 200)

    def test_pdf_export_correct_content_type(self):
        """PDF export should return the correct PDF MIME type"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('reports:export_pdf'))
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_pdf_export_has_attachment_header(self):
        """PDF export response should include a Content-Disposition header"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('reports:export_pdf'))
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn('team_report.pdf', response['Content-Disposition'])

    def test_exports_redirect_if_not_logged_in(self):
        """Both exports should redirect to login if user is not authenticated"""
        excel_response = self.client.get(reverse('reports:export_excel'))
        pdf_response = self.client.get(reverse('reports:export_pdf'))
        self.assertEqual(excel_response.status_code, 302)
        self.assertEqual(pdf_response.status_code, 302)