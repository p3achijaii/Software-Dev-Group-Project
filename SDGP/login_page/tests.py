import json
from base64 import b64decode
from datetime import timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import (
    PlatformAccount,
    PlatformDashboardActivity,
    PlatformDashboardQuickToolSlot,
    PlatformInboxMessage,
    PlatformPasswordHistory,
    PlatformProfile,
    PlatformScheduleEvent,
    PlatformTeam,
)


class LoginPageTests(TestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.user_password = 'simple-user-pass-2026'
        self.admin_password = 'simple-admin-pass-2026'
        self.regular_user = self.user_model.objects.create_user(
            username='sultan',
            email='123@sky.com',
            password=self.user_password,
            user_type='user',
        )
        self.admin_user = self.user_model.objects.create_user(
            username='adminsky',
            email='admin@sky.com',
            password=self.admin_password,
            user_type='admin',
            is_staff=True,
        )

    def get_new_account_payload(self):
        return {
            'full_name': 'Sultan Suleyman',
            'username': 'sulsuleyman',
            'date_of_birth': '2005-05-15',
            'gender': 'Male',
            'email': 'sultan.suleyman@sky.com',
            'phone_number': '+34 632 123456',
            'status': 'On Vacation',
            'team_name': 'Development Team',
            'team_role': 'Backend Developer',
            'department_name': 'IT Department',
            'department_head': 'Selim Yilmaz',
            'member_skills': 'Python - Specialist | SQL - Practitioner',
        }

    def get_quick_tools_slot_state_payload(self):
        return ['tile-1', None, 'tile-4']

    def get_sample_profile_image_upload(self):
        sampleImageBytes = self.get_sample_profile_image_bytes()
        return SimpleUploadedFile(
            name='avatar.png',
            content=sampleImageBytes,
            content_type='image/png',
        )

    def get_sample_profile_image_bytes(self):
        return b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9W6YIhEAAAAASUVORK5CYII='
        )

    def get_search_seed_usernames(self):
        return [
            'search_seed_alex',
            'search_seed_nora',
            'search_seed_ilya',
            'search_seed_marta',
            'search_seed_danylo',
        ]

    def test_platform_user_email_is_unique(self):
        self.assertTrue(self.regular_user._meta.get_field('email').unique)

    def test_password_is_hashed(self):
        self.assertNotEqual(self.regular_user.password, self.user_password)
        self.assertTrue(self.regular_user.check_password(self.user_password))

    def test_login_page_returns_200(self):
        response = self.client.get(reverse('login_page:login_page'))

        self.assertEqual(response.status_code, 200)

    def test_home_route_redirects_anonymous_to_login_page(self):
        response = self.client.get(reverse('home'))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('login_page:login_page'))

    def test_login_route_redirects_authenticated_admin_to_dashboard(self):
        self.client.force_login(self.admin_user)

        response = self.client.get(reverse('login_page:login_page'))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('login_page:admin_side'))

    def test_home_route_redirects_authenticated_regular_user_to_user_home(self):
        PlatformProfile.objects.create(
            platform_user=self.regular_user,
            full_name='Sultan Suleyman',
            date_of_birth='2005-05-15',
            gender='Male',
            phone_number='+34 632 123456',
            status='On Vacation',
            team_name='Development Team',
            team_role='Backend Developer',
            department_name='IT Department',
            department_head='Selim Yilmaz',
            member_skills='Python - Specialist',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('home'), follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/user_home.html')

    def test_logout_route_logs_out_authenticated_user_and_redirects_to_login(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:logout'))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('login_page:login_page'))
        self.assertNotIn('_auth_user_id', self.client.session)

        followResponse = self.client.get(reverse('login_page:login_page'))
        self.assertEqual(followResponse.status_code, 200)
        self.assertTemplateUsed(followResponse, 'login_page/login.html')

    def test_logout_route_redirects_anonymous_user_to_login(self):
        response = self.client.get(reverse('login_page:logout'))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('login_page:login_page'))

    def test_login_page_links_to_account_page_without_popup(self):
        response = self.client.get(reverse('login_page:login_page'))

        self.assertContains(response, reverse('login_page:account'))
        self.assertContains(response, 'data-sign-up-url=')
        self.assertNotContains(response, 'Create a new account')
        self.assertNotContains(response, 'id="sign-up-popup-panel"')
        self.assertNotContains(response, 'id="sign-up-form"')

    def test_login_page_shows_account_created_feedback_and_prefills_email(self):
        response = self.client.get(
            f"{reverse('login_page:login_page')}?account_created=success&email=fresh.account%40sky.com"
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Account created successfully. Please sign in.')
        self.assertContains(response, 'value="fresh.account@sky.com"')

    def test_valid_regular_user_sign_in_returns_new_account_redirect_when_profile_missing(self):
        response = self.client.post(
            reverse('login_page:sign_in'),
            {
                'email': self.regular_user.email,
                'password': self.user_password,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()['redirect_to'],
            f"{reverse('login_page:profile')}?mode=new",
        )

    def test_valid_regular_user_with_profile_sign_in_returns_user_home_redirect(self):
        PlatformProfile.objects.create(
            platform_user=self.regular_user,
            full_name='Sultan Suleyman',
            date_of_birth='2005-05-15',
            gender='Male',
            phone_number='+34 632 123456',
            status='On Vacation',
            team_name='Development Team',
            team_role='Backend Developer',
            department_name='IT Department',
            department_head='Selim Yilmaz',
            member_skills='Python - Specialist',
        )

        response = self.client.post(
            reverse('login_page:sign_in'),
            {
                'email': self.regular_user.email,
                'password': self.user_password,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()['redirect_to'],
            reverse('login_page:user_home'),
        )

    def test_valid_admin_sign_in_returns_admin_side_redirect(self):
        response = self.client.post(
            reverse('login_page:sign_in'),
            {
                'email': self.admin_user.email,
                'password': self.admin_password,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()['redirect_to'],
            reverse('login_page:admin_side'),
        )

    def test_invalid_credentials_return_error_json(self):
        response = self.client.post(
            reverse('login_page:sign_in'),
            {
                'email': self.regular_user.email,
                'password': 'wrong-password',
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['message'], 'Wrong password or e-mail.')
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_successful_sign_up_creates_regular_user_and_logs_them_in(self):
        response = self.client.post(
            reverse('login_page:sign_up'),
            {
                'username': 'newperson',
                'email': 'newperson@sky.com',
                'password': 'newperson-pass-2026',
                'confirm_password': 'newperson-pass-2026',
            },
        )

        createdUser = self.user_model.objects.get(email='newperson@sky.com')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(createdUser.user_type, 'user')
        self.assertTrue(createdUser.check_password('newperson-pass-2026'))
        self.assertEqual(
            response.json()['redirect_to'],
            f"{reverse('login_page:profile')}?mode=new",
        )
        self.assertEqual(
            str(self.client.session['_auth_user_id']),
            str(createdUser.pk),
        )

    def test_profile_post_creates_profile_and_updates_user(self):
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:profile'),
            self.get_new_account_payload(),
        )

        self.regular_user.refresh_from_db()
        createdProfile = PlatformProfile.objects.get(platform_user=self.regular_user)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.regular_user.username, 'sulsuleyman')
        self.assertEqual(self.regular_user.email, 'sultan.suleyman@sky.com')
        self.assertEqual(createdProfile.full_name, 'Sultan Suleyman')
        self.assertEqual(createdProfile.phone_number, '+34 632 123456')
        self.assertEqual(createdProfile.status, 'On Vacation')
        self.assertEqual(createdProfile.member_skills, 'Python - Specialist | SQL - Practitioner')
        self.assertIsNotNone(createdProfile.platform_team)
        self.assertEqual(createdProfile.platform_team.name, 'Development Team')
        self.assertTrue(PlatformTeam.objects.filter(name='Development Team').exists())

    def test_profile_post_syncs_existing_account_details(self):
        PlatformAccount.objects.create(
            platform_user=self.regular_user,
            full_name='Old Name',
            username='oldusername',
            email='old.account@sky.com',
            date_of_birth='1990-01-01',
            gender='Old Gender',
            phone_number='+34 111 111111',
            status='Busy',
            team_name='Old Team',
            team_role='Old Role',
            department_name='Old Department',
            department_head='Old Head',
            member_skills='Old Skill - Novice',
        )
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:profile'),
            self.get_new_account_payload(),
        )

        syncedAccount = PlatformAccount.objects.get(platform_user=self.regular_user)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(syncedAccount.full_name, 'Sultan Suleyman')
        self.assertEqual(syncedAccount.username, 'sulsuleyman')
        self.assertEqual(syncedAccount.email, 'sultan.suleyman@sky.com')
        self.assertEqual(syncedAccount.status, 'On Vacation')
        self.assertEqual(syncedAccount.team_role, 'Backend Developer')
        self.assertEqual(syncedAccount.member_skills, 'Python - Specialist | SQL - Practitioner')

    def test_profile_page_uses_profile_template_with_searchable_inputs(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(f"{reverse('login_page:profile')}?mode=new")

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/Profile.html')
        self.assertContains(
            response,
            f'href="{reverse("login_page:user_home")}" class="return_to_login"',
        )
        self.assertContains(response, 'id="phone-number"')
        self.assertContains(response, 'id="team-name"')
        self.assertContains(response, 'id="department-name"')
        self.assertContains(response, 'id="department-head"')
        self.assertContains(response, 'id="profile-form" enctype="multipart/form-data"')
        self.assertContains(response, 'id="profile-image-upload"')
        self.assertNotContains(response, 'id="team-name" readonly')
        self.assertNotContains(response, 'id="department-name" readonly')
        self.assertNotContains(response, 'id="department-head" readonly')
        self.assertNotContains(response, 'Reset password')

    def test_profile_post_saves_uploaded_image_in_database(self):
        self.client.force_login(self.regular_user)
        postPayload = self.get_new_account_payload()
        postPayload['profile_image'] = self.get_sample_profile_image_upload()

        response = self.client.post(
            reverse('login_page:profile'),
            data=postPayload,
        )

        createdProfile = PlatformProfile.objects.get(platform_user=self.regular_user)

        self.assertEqual(response.status_code, 302)
        self.assertIsNotNone(createdProfile.profile_image)
        self.assertGreater(len(createdProfile.profile_image), 0)
        self.assertEqual(createdProfile.profile_image_content_type, 'image/png')

    def test_profile_edit_locks_identity_fields_and_ignores_tampering(self):
        PlatformProfile.objects.create(
            platform_user=self.regular_user,
            full_name='Locked Name',
            date_of_birth='1999-01-01',
            gender='Male',
            phone_number='+34 632 123456',
            status='Available',
            team_name='Development Team',
            team_role='Backend Developer',
            department_name='IT Department',
            department_head='Selim Yilmaz',
            member_skills='Python - Specialist',
        )
        self.client.force_login(self.regular_user)
        postPayload = self.get_new_account_payload()
        postPayload.update(
            {
                'full_name': 'Tampered Name',
                'username': 'tamperedusername',
                'date_of_birth': '2010-10-10',
                'phone_number': '+34 999 000001',
            }
        )

        response = self.client.post(reverse('login_page:profile'), postPayload)

        self.regular_user.refresh_from_db()
        updatedProfile = PlatformProfile.objects.get(platform_user=self.regular_user)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.regular_user.username, 'sultan')
        self.assertEqual(updatedProfile.full_name, 'Locked Name')
        self.assertEqual(str(updatedProfile.date_of_birth), '1999-01-01')
        self.assertEqual(updatedProfile.phone_number, '+34 999 000001')

    def test_profile_edit_form_marks_identity_fields_as_readonly(self):
        PlatformProfile.objects.create(
            platform_user=self.regular_user,
            full_name='Locked Name',
            date_of_birth='1999-01-01',
            gender='Male',
            phone_number='+34 632 123456',
            status='Available',
            team_name='Development Team',
            team_role='Backend Developer',
            department_name='IT Department',
            department_head='Selim Yilmaz',
            member_skills='Python - Specialist',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:profile'))
        form = response.context['new_account_form']

        self.assertTrue(form.identity_fields_locked)
        self.assertEqual(form.fields['full_name'].widget.attrs.get('readonly'), 'readonly')
        self.assertEqual(form.fields['username'].widget.attrs.get('readonly'), 'readonly')
        self.assertEqual(form.fields['date_of_birth'].widget.attrs.get('readonly'), 'readonly')

    def test_profile_post_updates_only_authenticated_user_profile(self):
        secondUser = self.user_model.objects.create_user(
            username='otheruser',
            email='other.user@sky.com',
            password='other-user-pass-2026',
            user_type='user',
        )
        secondUserProfile = PlatformProfile.objects.create(
            platform_user=secondUser,
            full_name='Second Person',
            date_of_birth='1998-02-02',
            gender='Female',
            phone_number='+34 777 888999',
            status='Busy',
            team_name='Ops Team',
            team_role='Operator',
            department_name='Operations Department',
            department_head='Maya Patel',
            member_skills='Operations - Specialist',
        )
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:profile'),
            self.get_new_account_payload(),
        )

        self.assertEqual(response.status_code, 302)
        secondUserProfile.refresh_from_db()
        self.assertEqual(secondUserProfile.full_name, 'Second Person')
        self.assertEqual(secondUserProfile.phone_number, '+34 777 888999')

    def test_account_page_uses_account_template_and_has_no_static_profile_placeholders(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:account'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/account.html')
        self.assertContains(response, 'id="account-form"')
        self.assertContains(response, 'id="account-team-name"')
        self.assertContains(response, 'id="account-department-name"')
        self.assertContains(response, 'id="account-department-head"')
        self.assertNotContains(response, 'id="account-team-name" readonly')
        self.assertNotContains(response, 'id="account-department-name" readonly')
        self.assertNotContains(response, 'id="account-department-head" readonly')
        self.assertNotContains(response, 'Reset password')
        self.assertNotContains(response, 'Sultan Suleyman')
        self.assertNotContains(response, '+34 632 123456')

    def test_anonymous_account_page_uses_blank_registration_fields(self):
        response = self.client.get(reverse('login_page:account'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/account.html')
        self.assertContains(
            response,
            f'href="{reverse("login_page:login_page")}" class="return_to_login"',
        )
        self.assertContains(response, 'id="account-phone-number"')
        self.assertContains(response, 'id="account-password"')
        self.assertNotContains(response, 'id="account-confirm-password"')
        self.assertNotContains(response, 'value="**************"')

    def test_authenticated_account_page_uses_dashboard_logo_link(self):
        self.client.force_login(self.admin_user)

        response = self.client.get(reverse('login_page:account'))

        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, 'Log out')
        self.assertContains(
            response,
            f'href="{reverse("login_page:admin_side")}" class="return_to_login"',
        )

    def test_authenticated_account_page_uses_profile_avatar_from_database(self):
        PlatformProfile.objects.create(
            platform_user=self.regular_user,
            full_name='Sultan Suleyman',
            date_of_birth='2005-05-15',
            gender='Male',
            phone_number='+34 632 123456',
            status='On Vacation',
            team_name='Development Team',
            team_role='Backend Developer',
            department_name='IT Department',
            department_head='Selim Yilmaz',
            member_skills='Python - Specialist',
            profile_image=self.get_sample_profile_image_bytes(),
            profile_image_content_type='image/png',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:account'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'src="data:image/png;base64,')

    def test_account_post_creates_account_entry_and_updates_user(self):
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:account'),
            self.get_new_account_payload(),
        )

        self.regular_user.refresh_from_db()
        createdAccount = PlatformAccount.objects.get(platform_user=self.regular_user)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, f"{reverse('login_page:account')}?saved=success")
        self.assertEqual(createdAccount.full_name, 'Sultan Suleyman')
        self.assertEqual(createdAccount.username, 'sulsuleyman')
        self.assertEqual(createdAccount.email, 'sultan.suleyman@sky.com')
        self.assertEqual(createdAccount.phone_number, '+34 632 123456')
        self.assertEqual(createdAccount.member_skills, 'Python - Specialist | SQL - Practitioner')
        self.assertEqual(self.regular_user.username, 'sulsuleyman')
        self.assertEqual(self.regular_user.email, 'sultan.suleyman@sky.com')
        self.assertEqual(self.regular_user.platform_profile.phone_number, '+34 632 123456')
        self.assertTrue(PlatformProfile.objects.filter(platform_user=self.regular_user).exists())

    def test_anonymous_account_post_creates_user_account_profile_and_returns_to_login(self):
        accountPayload = {
            **self.get_new_account_payload(),
            'username': 'freshaccount',
            'email': 'fresh.account@sky.com',
            'password': 'Fresh-account-2026!',
        }

        response = self.client.post(
            reverse('login_page:account'),
            accountPayload,
        )

        createdUser = self.user_model.objects.get(email='fresh.account@sky.com')
        createdAccount = PlatformAccount.objects.get(platform_user=createdUser)
        createdProfile = PlatformProfile.objects.get(platform_user=createdUser)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.url,
            f"{reverse('login_page:login_page')}?account_created=success&email=fresh.account%40sky.com",
        )
        self.assertTrue(createdUser.check_password('Fresh-account-2026!'))
        self.assertEqual(createdAccount.full_name, 'Sultan Suleyman')
        self.assertEqual(createdAccount.phone_number, '+34 632 123456')
        self.assertEqual(createdProfile.full_name, 'Sultan Suleyman')
        self.assertEqual(createdProfile.phone_number, '+34 632 123456')
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_anonymous_account_post_rejects_short_password(self):
        accountPayload = {
            **self.get_new_account_payload(),
            'username': 'shortpassuser',
            'email': 'short.pass@sky.com',
            'password': 'short1',
        }

        response = self.client.post(
            reverse('login_page:account'),
            accountPayload,
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Please place at least 8 characters.')
        self.assertFalse(self.user_model.objects.filter(email='short.pass@sky.com').exists())

    def test_legacy_new_account_alias_still_opens_profile_page(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:new_account'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/Profile.html')

    def test_user_home_uses_user_home_template(self):
        PlatformProfile.objects.create(
            platform_user=self.regular_user,
            full_name='Sultan Suleyman',
            date_of_birth='2005-05-15',
            gender='Male',
            phone_number='+34 632 123456',
            status='On Vacation',
            team_name='Development Team',
            team_role='Backend Developer',
            department_name='IT Department',
            department_head='Selim Yilmaz',
            member_skills='Python - Specialist',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:user_home'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/user_home.html')

    def test_user_home_auto_seeds_team_assignment_from_profile(self):
        createdProfile = PlatformProfile.objects.create(
            platform_user=self.regular_user,
            full_name='Sultan Suleyman',
            date_of_birth='2005-05-15',
            gender='Male',
            phone_number='+34 632 123456',
            status='On Vacation',
            team_name='Auto Seed Team',
            team_role='Backend Developer',
            department_name='IT Department',
            department_head='Selim Yilmaz',
            member_skills='Python - Specialist',
        )
        self.assertIsNone(createdProfile.platform_team)
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:user_home_tool_team'))
        createdProfile.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/teams.html')
        self.assertIsNotNone(createdProfile.platform_team)
        self.assertEqual(createdProfile.platform_team.name, 'Auto Seed Team')
        self.assertContains(response, 'Auto Seed Team')

    def test_teams_page_uses_dashboard_top_row_search_assets(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:user_home_tool_team'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="teams-search-input"')
        self.assertContains(response, 'Search teams, departments, or managers')
        self.assertContains(response, 'user-home-search-url')
        self.assertContains(response, 'user-home/search/team-directory/')
        self.assertContains(response, 'dashboard/user_home_search.js')

    def test_teams_page_search_endpoint_returns_teams_and_departments_only(self):
        PlatformTeam.objects.create(
            name='Directory Team',
            slug='directory-team',
            team_lead='Directory Lead',
            department_name='Directory Department',
            department_head='Directory Head',
        )
        memberUser = self.user_model.objects.create_user(
            username='directory.member',
            email='directory.member@sky.com',
            password='directory-pass-2026',
            user_type='user',
        )
        PlatformProfile.objects.create(
            platform_user=memberUser,
            full_name='Directory Member',
            date_of_birth='2005-05-15',
            gender='Male',
            phone_number='+34 632 000002',
            status='Available',
            team_name='Directory Team',
            team_role='Developer',
            department_name='Directory Department',
            department_head='Directory Head',
            member_skills='Python - Specialist',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(
            reverse('login_page:user_home_team_directory_search'),
            {'query': 'Directory'},
        )

        self.assertEqual(response.status_code, 200)
        results = response.json()['results']
        resultTypes = {resultItem['result_type'] for resultItem in results}
        self.assertIn('team', resultTypes)
        self.assertIn('department', resultTypes)
        self.assertTrue(
            any(resultItem['full_name'] == 'Directory Team' for resultItem in results)
        )
        self.assertTrue(
            any(resultItem['full_name'] == 'Directory Department' for resultItem in results)
        )
        self.assertFalse(
            any(resultItem.get('full_name') == 'Directory Member' for resultItem in results)
        )
        self.assertFalse(any('email' in resultItem for resultItem in results))

    def test_team_detail_members_follow_admin_team_transfer(self):
        transferTeam = PlatformTeam.objects.create(
            name='Transfer Team',
            slug='transfer-team',
            team_lead='Transfer Lead',
        )
        createdProfile = PlatformProfile.objects.create(
            platform_user=self.regular_user,
            platform_team=transferTeam,
            full_name='Sultan Suleyman',
            date_of_birth='2005-05-15',
            gender='Male',
            phone_number='+34 632 123456',
            status='On Vacation',
            team_name='Old Team',
            team_role='Backend Developer',
            department_name='IT Department',
            department_head='Selim Yilmaz',
            member_skills='Python - Specialist',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(
            reverse(
                'login_page:user_home_tool_team_detail',
                kwargs={'team_slug': transferTeam.slug},
            )
        )
        createdProfile.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/team.html')
        self.assertEqual(createdProfile.team_name, 'Transfer Team')
        self.assertContains(response, 'Sultan Suleyman')
        self.assertContains(response, 'Backend Developer')

    def test_team_settings_post_updates_database_and_overview(self):
        platformTeam = PlatformTeam.objects.create(
            name='Settings Team',
            slug='settings-team',
            team_lead='Settings Lead',
            github_link='https://github.com/sky/settings-team',
            department_name='Settings Department',
            department_head='Settings Head',
        )
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse(
                'login_page:user_home_tool_team_detail',
                kwargs={'team_slug': platformTeam.slug},
            ),
            {
                'key_contact_1': 'New Contact One',
                'key_contact_2': 'New Contact Two',
                'jira_project_name': 'Settings Jira',
                'jira_board_link': 'https://jira.example.com/settings-team',
                'git_project_name': 'Settings Git',
                'github_link': 'https://github.com/sky/settings-team-updated',
                'dependency_name': 'Billing Platform',
                'dependency_type': 'Downstream',
                'software_owned': 'Settings Portal',
                'versioning_approaches': 'Semantic versioning',
                'wiki_link': 'https://wiki.example.com/settings-team',
                'wiki_search_terms': 'Settings Search',
                'slack_channels': '#settings-team',
                'slack_link': 'https://slack.com/settings-team',
                'daily_standup_time': '10:45',
                'daily_standup_link': 'https://meet.example.com/settings-team',
                'about_team': 'Settings Team owns synchronized team configuration.',
                'key_skills': 'Django | JavaScript',
                'focus_areas': 'Automation | Reliability',
            },
        )
        platformTeam.refresh_from_db()

        self.assertEqual(response.status_code, 302)
        self.assertEqual(platformTeam.key_contact_1, 'New Contact One')
        self.assertEqual(platformTeam.github_link, 'https://github.com/sky/settings-team-updated')
        self.assertEqual(platformTeam.about_team, 'Settings Team owns synchronized team configuration.')
        self.assertEqual(platformTeam.key_skills, 'Django | JavaScript')
        self.assertEqual(platformTeam.focus_areas, 'Automation | Reliability')
        self.assertEqual(platformTeam.team_dependencies.count(), 1)
        self.assertFalse(platformTeam.team_dependencies.first().is_upstream)

        overviewResponse = self.client.get(
            reverse(
                'login_page:user_home_tool_team_detail',
                kwargs={'team_slug': platformTeam.slug},
            )
        )
        self.assertContains(
            overviewResponse,
            'Settings Team owns synchronized team configuration.',
        )
        self.assertContains(overviewResponse, 'Automation')
        self.assertContains(overviewResponse, 'Django')
        self.assertContains(overviewResponse, 'Billing Platform')

    def test_team_settings_post_saves_uploaded_team_image(self):
        platformTeam = PlatformTeam.objects.create(
            name='Image Team',
            slug='image-team',
            team_lead='Image Lead',
        )
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse(
                'login_page:user_home_tool_team_detail',
                kwargs={'team_slug': platformTeam.slug},
            ),
            {
                'team_image': self.get_sample_profile_image_upload(),
                'key_contact_1': '',
                'key_contact_2': '',
                'jira_project_name': '',
                'jira_board_link': '',
                'git_project_name': '',
                'github_link': '',
                'dependency_name': '',
                'dependency_type': '',
                'software_owned': '',
                'versioning_approaches': '',
                'wiki_link': '',
                'wiki_search_terms': '',
                'slack_channels': '',
                'slack_link': '',
                'daily_standup_time': '',
                'daily_standup_link': '',
                'about_team': '',
                'key_skills': '',
                'focus_areas': '',
            },
        )
        platformTeam.refresh_from_db()

        self.assertEqual(response.status_code, 302)
        self.assertIsNotNone(platformTeam.team_image)
        self.assertGreater(len(platformTeam.team_image), 0)
        self.assertEqual(platformTeam.team_image_content_type, 'image/png')

        teamResponse = self.client.get(
            reverse(
                'login_page:user_home_tool_team_detail',
                kwargs={'team_slug': platformTeam.slug},
            )
        )
        self.assertContains(teamResponse, 'src="data:image/png;base64,')

    def test_team_overview_shows_all_criteria_entries_from_database(self):
        focusAreas = [f'Focus Area {index}' for index in range(1, 15)]
        keySkills = [f'Key Skill {index}' for index in range(1, 15)]
        platformTeam = PlatformTeam.objects.create(
            name='Criteria Team',
            slug='criteria-team',
            team_lead='Criteria Lead',
            focus_areas=' | '.join(focusAreas),
            key_skills=' | '.join(keySkills),
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(
            reverse(
                'login_page:user_home_tool_team_detail',
                kwargs={'team_slug': platformTeam.slug},
            )
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Focus Area 14')
        self.assertContains(response, 'Key Skill 14')

    def test_team_settings_post_saves_non_strict_link_values(self):
        platformTeam = PlatformTeam.objects.create(
            name='Plain Link Team',
            slug='plain-link-team',
            team_lead='Plain Link Lead',
        )
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse(
                'login_page:user_home_tool_team_detail',
                kwargs={'team_slug': platformTeam.slug},
            ),
            {
                'key_contact_1': 'Plain Contact One',
                'key_contact_2': 'Plain Contact Two',
                'jira_project_name': 'Plain Jira',
                'jira_board_link': 'jira-board/plain-link-team',
                'git_project_name': 'Plain Git',
                'github_link': 'github.com/sky/plain-link-team',
                'dependency_name': 'Plain Dependency',
                'dependency_type': 'upstream',
                'software_owned': 'Plain Platform',
                'versioning_approaches': 'Calendar versioning',
                'wiki_link': 'wiki/plain-link-team',
                'wiki_search_terms': 'Plain Search',
                'slack_channels': '#plain-link-team',
                'slack_link': 'slack/plain-link-team',
                'daily_standup_time': '09:30',
                'daily_standup_link': 'meet/plain-link-team',
                'about_team': 'Plain link team settings update',
                'key_skills': 'Python | Django',
                'focus_areas': 'Reliability | Delivery',
            },
        )
        platformTeam.refresh_from_db()

        self.assertEqual(response.status_code, 302)
        self.assertEqual(platformTeam.github_link, 'github.com/sky/plain-link-team')
        self.assertEqual(platformTeam.jira_board_link, 'jira-board/plain-link-team')
        self.assertEqual(platformTeam.wiki_link, 'wiki/plain-link-team')
        self.assertEqual(platformTeam.daily_standup_link, 'meet/plain-link-team')

    def test_team_member_message_link_opens_inbox_compose_with_email(self):
        platformTeam = PlatformTeam.objects.create(
            name='Message Team',
            slug='message-team',
            team_lead='Message Lead',
        )
        memberUser = self.user_model.objects.create_user(
            username='message.member',
            email='message.member@sky.com',
            password='member-pass-2026',
            user_type='user',
        )
        PlatformProfile.objects.create(
            platform_user=memberUser,
            platform_team=platformTeam,
            full_name='Message Member',
            date_of_birth='2005-05-15',
            gender='Male',
            phone_number='+34 632 000000',
            status='Available',
            team_name='Message Team',
            team_role='Backend Developer',
            department_name='Message Department',
            department_head='Message Head',
            member_skills='Django - Specialist',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(
            reverse(
                'login_page:user_home_tool_team_detail',
                kwargs={'team_slug': platformTeam.slug},
            )
        )

        expectedUrl = (
            f"{reverse('login_page:user_home_tool_message')}"
            '?compose_to=message.member%40sky.com'
        )
        self.assertContains(response, expectedUrl)
        self.assertNotContains(response, 'mailto:message.member@sky.com')

    def test_team_quick_contact_message_link_resolves_profile_email(self):
        contactUser = self.user_model.objects.create_user(
            username='contact.person',
            email='contact.person@sky.com',
            password='contact-pass-2026',
            user_type='user',
        )
        PlatformProfile.objects.create(
            platform_user=contactUser,
            full_name='Contact Person',
            date_of_birth='2005-05-15',
            gender='Female',
            phone_number='+34 632 000001',
            status='Available',
            team_name='Contact Team',
            team_role='Department Head',
            department_name='Contact Department',
            department_head='Contact Person',
            member_skills='Leadership - Specialist',
        )
        platformTeam = PlatformTeam.objects.create(
            name='Contact Team',
            slug='contact-team',
            team_lead='Contact Person',
            department_head='Contact Person',
            key_contact_1='Contact Person',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(
            reverse(
                'login_page:user_home_tool_team_detail',
                kwargs={'team_slug': platformTeam.slug},
            )
        )

        expectedUrl = (
            f"{reverse('login_page:user_home_tool_message')}"
            '?compose_to=contact.person%40sky.com'
        )
        self.assertContains(response, expectedUrl)

    def test_inbox_page_accepts_compose_prefill_from_query_string(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(
            reverse('login_page:user_home_tool_message'),
            {'compose_to': 'message.member@sky.com'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.context['inbox_compose_prefill']['recipient'],
            'message.member@sky.com',
        )
        self.assertContains(response, 'inbox-compose-prefill')
        self.assertContains(response, 'message.member@sky.com')

    def test_user_home_top_row_uses_profile_avatar_from_database(self):
        PlatformProfile.objects.create(
            platform_user=self.regular_user,
            full_name='Sultan Suleyman',
            date_of_birth='2005-05-15',
            gender='Male',
            phone_number='+34 632 123456',
            status='On Vacation',
            team_name='Development Team',
            team_role='Backend Developer',
            department_name='IT Department',
            department_head='Selim Yilmaz',
            member_skills='Python - Specialist',
            profile_image=self.get_sample_profile_image_bytes(),
            profile_image_content_type='image/png',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:user_home'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'src="data:image/png;base64,')

    def test_user_home_loads_default_empty_quick_tool_slots(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:user_home'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.context['user_home_quick_tool_slot_state'],
            [None, None, None],
        )
        self.assertTrue(response.context['user_home_db_probe_character'])
        self.assertEqual(len(response.context['user_home_db_probe_character']), 1)

    def test_user_home_seeds_single_placeholder_recent_activity_entry(self):
        self.client.force_login(self.regular_user)
        response = self.client.get(reverse('login_page:user_home'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            PlatformDashboardActivity.objects.filter(platform_user=self.regular_user).count(),
            1,
        )
        self.assertEqual(len(response.context['user_home_recent_activity']), 1)

    def test_user_home_recent_activity_is_ordered_newest_first(self):
        PlatformDashboardActivity.objects.create(
            platform_user=self.regular_user,
            activity_text='Older entry',
            activity_icon='github',
        )
        PlatformDashboardActivity.objects.create(
            platform_user=self.regular_user,
            activity_text='Newest entry',
            activity_icon='github',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:user_home'))
        recentActivity = response.context['user_home_recent_activity']

        self.assertEqual(recentActivity[0].activity_text, 'Newest entry')
        self.assertEqual(recentActivity[1].activity_text, 'Older entry')

    def test_user_home_placeholder_recent_activity_expires_after_24_hours(self):
        self.client.force_login(self.regular_user)
        self.client.get(reverse('login_page:user_home'))

        placeholderActivity = PlatformDashboardActivity.objects.filter(
            platform_user=self.regular_user
        ).first()
        placeholderActivity.created_at = timezone.now() - timedelta(hours=25)
        placeholderActivity.save(update_fields=['created_at'])

        response = self.client.get(reverse('login_page:user_home'))
        recentActivity = response.context['user_home_recent_activity']

        self.assertEqual(recentActivity, [])

    def test_user_home_context_sets_unread_message_alert_for_bell_icon(self):
        PlatformInboxMessage.objects.create(
            platform_user=self.regular_user,
            sender_name='Team Coordinator',
            sender_email='team.coordinator@sky.com',
            email_subject='Unread inbox message',
            email_body='Please check this inbox message.',
            is_read=False,
        )
        PlatformInboxMessage.objects.create(
            platform_user=self.regular_user,
            sender_name='Schedule Assistant',
            sender_email='schedule.assistant@sky.com',
            email_subject='Read inbox message',
            email_body='Already seen inbox message.',
            is_read=True,
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:user_home'))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context['user_home_has_unread_messages'])
        self.assertEqual(response.context['user_home_unread_message_count'], 1)
        self.assertContains(response, 'data-has-unread-messages="true"')

    def test_schedule_page_uses_database_events_for_calendar_state(self):
        PlatformScheduleEvent.objects.create(
            platform_user=self.regular_user,
            title='Database planning session',
            event_date='2026-04-27',
            start_time='09:30',
            end_time='10:30',
            platform='Teams',
            invite_members='Platform Team',
            color='rgba(14, 165, 233, 1)',
            color_secondary='rgba(37, 99, 235, 1)',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:user_home_tool_calendar'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/schedule.html')
        self.assertContains(response, 'schedule-event-state')
        self.assertContains(response, 'schedule/schedule_frame_height.js')
        self.assertContains(response, 'schedule/schedule_calendar_sync.js')
        self.assertContains(response, 'schedule/schedule_quick_tool.js')
        self.assertEqual(len(response.context['schedule_event_state']), 1)
        scheduleEvent = response.context['schedule_event_state'][0]
        self.assertEqual(scheduleEvent['title'], 'Database planning session')
        self.assertEqual(scheduleEvent['date'], '2026-04-27')
        self.assertEqual(scheduleEvent['startTime'], '09:30')
        self.assertEqual(scheduleEvent['endTime'], '10:30')
        self.assertEqual(scheduleEvent['startMinutes'], 570)
        self.assertEqual(scheduleEvent['endMinutes'], 630)

    def test_data_visualisation_page_uses_database_team_records(self):
        PlatformTeam.objects.create(
            name='Analytics Guild',
            slug='analytics-guild',
            team_lead='Mila Antonova',
            department_name='Data Office',
            department_head='Mila Antonova',
            jira_project_name='Insight Pipeline',
            key_skills='Python | SQL | Power BI',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:user_home_tool_data'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/Data.html')
        self.assertContains(response, 'data-visualisation-records')
        self.assertContains(response, 'data/data_chart_switching.js')
        self.assertContains(response, 'user-home/tools/data/')
        matchingRecords = [
            recordItem
            for recordItem in response.context['data_visualisation_records']
            if recordItem['Team Name'] == 'Analytics Guild'
        ]
        self.assertEqual(len(matchingRecords), 1)
        self.assertEqual(matchingRecords[0]['Department'], 'Data Office')
        self.assertEqual(matchingRecords[0]['Jira Project Name'], 'Insight Pipeline')
        self.assertEqual(
            matchingRecords[0]['Key Skills & Technologies'],
            'Python | SQL | Power BI',
        )

    def test_schedule_event_endpoint_persists_event_and_returns_mapped_state(self):
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:user_home_schedule_events'),
            data=json.dumps(
                {
                    'date': '2026-04-28',
                    'startTime': '10:00',
                    'endTime': '11:15',
                    'platform': 'Zoom',
                    'inviteMembers': 'QA Team',
                    'color': 'rgba(34, 197, 94, 1)',
                }
            ),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            PlatformScheduleEvent.objects.filter(
                platform_user=self.regular_user,
                event_date='2026-04-28',
                start_time='10:00',
                end_time='11:15',
                platform='Zoom',
                invite_members='QA Team',
            ).exists()
        )
        responseData = response.json()
        self.assertEqual(responseData['event']['startMinutes'], 600)
        self.assertEqual(responseData['event']['endMinutes'], 675)
        self.assertTrue(
            any(
                eventItem['date'] == '2026-04-28'
                and eventItem['startTime'] == '10:00'
                and eventItem['endTime'] == '11:15'
                for eventItem in responseData['events']
            )
        )

    def test_schedule_event_endpoint_rejects_invalid_event_times(self):
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:user_home_schedule_events'),
            data=json.dumps(
                {
                    'date': '2026-04-28',
                    'startTime': '11:00',
                    'endTime': '10:00',
                    'platform': 'Zoom',
                    'inviteMembers': 'QA Team',
                }
            ),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['message'], 'End time must be later than start time.')
        self.assertFalse(PlatformScheduleEvent.objects.filter(platform_user=self.regular_user).exists())

    def test_inbox_page_marks_unread_messages_as_read(self):
        inboxMessage = PlatformInboxMessage.objects.create(
            platform_user=self.regular_user,
            sender_name='Team Coordinator',
            sender_email='team.coordinator@sky.com',
            email_subject='Unread message',
            email_body='This message should become read after opening inbox.',
            is_read=False,
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:user_home_tool_message'))
        inboxMessage.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/inbox.html')
        self.assertTrue(inboxMessage.is_read)

    def test_inbox_reply_post_saves_reply_body_and_sets_reply_state(self):
        inboxMessage = PlatformInboxMessage.objects.create(
            platform_user=self.regular_user,
            sender_name='Team Coordinator',
            sender_email='team.coordinator@sky.com',
            email_subject='Needs a reply',
            email_body='Please send your confirmation.',
            is_reply=False,
            email_reply='',
            is_read=False,
        )
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:user_home_tool_message'),
            {
                'message_id': inboxMessage.id,
                'email_reply': 'Confirmed. I will handle this today.',
            },
        )
        inboxMessage.refresh_from_db()

        self.assertEqual(response.status_code, 302)
        self.assertIn(f'message={inboxMessage.id}', response.url)
        self.assertIn('reply_saved=success', response.url)
        self.assertTrue(inboxMessage.is_reply)
        self.assertTrue(inboxMessage.is_read)
        self.assertEqual(inboxMessage.email_reply, 'Confirmed. I will handle this today.')

    def test_inbox_action_send_creates_sent_message_in_database(self):
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:user_home_tool_message_action'),
            data=json.dumps(
                {
                    'action': 'send',
                    'mode': 'sent',
                    'draft_type': 'compose',
                    'recipient': 'Operations Team',
                    'subject': 'Weekly progress update',
                    'body': 'The team has completed sprint tasks.',
                    'previous_message': '',
                }
            ),
            content_type='application/json',
        )
        createdMessage = PlatformInboxMessage.objects.get(
            platform_user=self.regular_user,
            email_subject='Weekly progress update',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(createdMessage.message_mode, 'sent')
        self.assertEqual(createdMessage.draft_type, 'compose')
        self.assertEqual(createdMessage.recipient_name, 'Operations Team')
        self.assertEqual(createdMessage.email_body, 'The team has completed sprint tasks.')

    def test_inbox_action_reply_updates_source_and_creates_sent_reply(self):
        inboxMessage = PlatformInboxMessage.objects.create(
            platform_user=self.regular_user,
            sender_name='Team Coordinator',
            sender_email='team.coordinator@sky.com',
            email_subject='Needs confirmation',
            email_body='Please confirm the delivery slot.',
            previous_message='Please confirm the delivery slot.',
            is_reply=False,
            email_reply='',
            is_read=False,
        )
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:user_home_tool_message_action'),
            data=json.dumps(
                {
                    'action': 'send',
                    'mode': 'sent',
                    'draft_type': 'reply',
                    'recipient': 'Team Coordinator',
                    'subject': 'Needs confirmation',
                    'body': 'Confirmed for today.',
                    'previous_message': 'Please confirm the delivery slot.',
                    'source_message_id': inboxMessage.id,
                }
            ),
            content_type='application/json',
        )
        inboxMessage.refresh_from_db()
        createdReply = PlatformInboxMessage.objects.get(
            platform_user=self.regular_user,
            message_mode='sent',
            email_subject='Needs confirmation',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(inboxMessage.is_reply)
        self.assertTrue(inboxMessage.is_read)
        self.assertEqual(inboxMessage.email_reply, 'Confirmed for today.')
        self.assertEqual(createdReply.draft_type, 'reply')
        self.assertEqual(createdReply.previous_message, 'Please confirm the delivery slot.')

    def test_inbox_action_save_draft_creates_draft_message_in_database(self):
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:user_home_tool_message_action'),
            data=json.dumps(
                {
                    'action': 'save_draft',
                    'mode': 'drafts',
                    'draft_type': 'compose',
                    'recipient': 'Project Team',
                    'subject': 'Draft: sprint priorities',
                    'body': 'Collecting sprint priorities.',
                    'previous_message': '',
                }
            ),
            content_type='application/json',
        )
        createdDraft = PlatformInboxMessage.objects.get(
            platform_user=self.regular_user,
            email_subject='Draft: sprint priorities',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(createdDraft.message_mode, 'drafts')
        self.assertEqual(createdDraft.draft_type, 'compose')
        self.assertEqual(createdDraft.email_body, 'Collecting sprint priorities.')

    def test_inbox_action_delete_hides_message_from_user_interface_only(self):
        inboxMessage = PlatformInboxMessage.objects.create(
            platform_user=self.regular_user,
            sender_name='Team Coordinator',
            sender_email='team.coordinator@sky.com',
            email_subject='Delete this message',
            email_body='This message should be removed.',
            is_read=True,
        )
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:user_home_tool_message_action'),
            data=json.dumps(
                {
                    'action': 'delete',
                    'message_id': inboxMessage.id,
                }
            ),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['message_id'], inboxMessage.id)
        inboxMessage.refresh_from_db()
        self.assertTrue(inboxMessage.is_hidden_from_user)

        inboxResponse = self.client.get(reverse('login_page:user_home_tool_message'))
        mailboxState = inboxResponse.context['mailbox_state']
        visibleMessageIds = [messageItem['id'] for messageItem in mailboxState['inbox']]
        self.assertNotIn(inboxMessage.id, visibleMessageIds)

    def test_inbox_action_delete_cannot_remove_another_users_message(self):
        secondUser = self.user_model.objects.create_user(
            username='deleteguard',
            email='deleteguard@sky.com',
            password='deleteguard-pass-2026',
            user_type='user',
        )
        inboxMessage = PlatformInboxMessage.objects.create(
            platform_user=secondUser,
            sender_name='Team Coordinator',
            sender_email='team.coordinator@sky.com',
            email_subject='Protected message',
            email_body='This message belongs to another user.',
            is_read=True,
        )
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:user_home_tool_message_action'),
            data=json.dumps(
                {
                    'action': 'delete',
                    'message_id': inboxMessage.id,
                }
            ),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 404)
        inboxMessage.refresh_from_db()
        self.assertFalse(inboxMessage.is_hidden_from_user)
        self.assertTrue(PlatformInboxMessage.objects.filter(pk=inboxMessage.id).exists())

    def test_user_home_search_endpoint_returns_empty_results_for_short_queries(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(
            reverse('login_page:user_home_search'),
            {'query': 'ab'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['results'], [])

    def test_user_home_search_endpoint_returns_db_backed_results(self):
        searchTargetUser = self.user_model.objects.create_user(
            username='piotr',
            email='piotr@sky.com',
            password='piotr-pass-2026',
            user_type='user',
        )
        PlatformProfile.objects.create(
            platform_user=searchTargetUser,
            full_name='Piotr Chebyrek',
            date_of_birth='2005-05-15',
            gender='Male',
            phone_number='+34 632 123456',
            status='Available',
            team_name='Development Team',
            team_role='Department Head',
            department_name='IT Department',
            department_head='Selim Yilmaz',
            member_skills='Python - Specialist',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(
            reverse('login_page:user_home_search'),
            {'query': 'pio'},
        )

        self.assertEqual(response.status_code, 200)
        results = response.json()['results']
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]['full_name'], 'Piotr Chebyrek')
        self.assertEqual(results[0]['team_role'], 'Department Head')
        self.assertEqual(results[0]['status'], 'Available')
        self.assertEqual(results[0]['email'], 'piotr@sky.com')
        self.assertTrue(results[0]['mail_to'].startswith('mailto:'))
        self.assertIn(
            reverse('login_page:user_home_tool_message'),
            results[0]['message_url'],
        )
        self.assertIn('compose_to=piotr%40sky.com', results[0]['message_url'])

    def test_user_home_search_endpoint_returns_profile_avatar_url(self):
        searchTargetUser = self.user_model.objects.create_user(
            username='nata',
            email='nata@sky.com',
            password='nata-pass-2026',
            user_type='user',
        )
        PlatformProfile.objects.create(
            platform_user=searchTargetUser,
            full_name='Nata River',
            date_of_birth='1998-07-01',
            gender='Female',
            phone_number='+34 632 654321',
            status='Available',
            team_name='Development Team',
            team_role='Frontend Developer',
            department_name='IT Department',
            department_head='Selim Yilmaz',
            member_skills='React - Specialist',
            profile_image=self.get_sample_profile_image_bytes(),
            profile_image_content_type='image/png',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(
            reverse('login_page:user_home_search'),
            {'query': 'nata'},
        )

        self.assertEqual(response.status_code, 200)
        results = response.json()['results']
        self.assertGreaterEqual(len(results), 1)
        self.assertTrue(results[0]['avatar_url'].startswith('data:image/png;base64,'))

    def test_user_home_search_endpoint_returns_each_profile_status_type_in_payload(self):
        statusCases = [
            ('Available', 'Status Alpha'),
            ('Busy', 'Status Bravo'),
            ('In Meeting', 'Status Charlie'),
            ('Working Remotely', 'Status Delta'),
            ('On Vacation', 'Status Echo'),
            ('Sick Leave', 'Status Foxtrot'),
            ('Offline', 'Status Golf'),
        ]

        for index, (statusValue, fullNameValue) in enumerate(statusCases):
            statusUser = self.user_model.objects.create_user(
                username=f'status_user_{index}',
                email=f'status_user_{index}@sky.com',
                password='status-pass-2026',
                user_type='user',
            )
            PlatformProfile.objects.create(
                platform_user=statusUser,
                full_name=fullNameValue,
                date_of_birth='1995-01-01',
                gender='Not specified',
                phone_number=f'+34 611 0000{index}',
                status=statusValue,
                team_name='Status Team',
                team_role='Status Role',
                department_name='Status Department',
                department_head='Status Lead',
                member_skills='Status Skill - Practitioner',
            )

        self.client.force_login(self.regular_user)

        for statusValue, fullNameValue in statusCases:
            response = self.client.get(
                reverse('login_page:user_home_search'),
                {'query': statusValue},
            )
            self.assertEqual(response.status_code, 200)
            results = response.json()['results']
            self.assertTrue(
                any(
                    resultItem['full_name'] == fullNameValue
                    and resultItem['status'] == statusValue
                    for resultItem in results
                ),
                msg=f'Expected "{fullNameValue}" with status "{statusValue}" in search payload.',
            )

    def test_seed_user_home_search_profiles_command_creates_five_users_and_profiles(self):
        commandOutput = StringIO()
        call_command('seed_user_home_search_profiles', stdout=commandOutput)

        searchSeedUsernames = self.get_search_seed_usernames()
        seededUsers = self.user_model.objects.filter(username__in=searchSeedUsernames)
        seededProfiles = PlatformProfile.objects.filter(platform_user__username__in=searchSeedUsernames)

        self.assertEqual(seededUsers.count(), 5)
        self.assertEqual(seededProfiles.count(), 5)
        self.assertEqual(seededUsers.filter(is_active=True, user_type='user').count(), 5)
        self.assertTrue(
            self.user_model.objects.get(username='search_seed_alex').check_password('Search-demo-pass-2026!')
        )
        self.assertIn('Shared demo password: Search-demo-pass-2026!', commandOutput.getvalue())

    def test_seed_user_home_search_profiles_command_applies_mixed_profile_statuses(self):
        call_command('seed_user_home_search_profiles')

        profileStatuses = list(
            PlatformProfile.objects.filter(
                platform_user__username__in=self.get_search_seed_usernames()
            )
            .order_by('platform_user__username')
            .values_list('status', flat=True)
        )
        uniqueStatuses = set(profileStatuses)

        self.assertEqual(len(profileStatuses), 5)
        self.assertEqual(len(uniqueStatuses), 3)
        self.assertCountEqual(
            profileStatuses,
            [
                'Available',
                'Busy',
                'Working Remotely',
                'Available',
                'Busy',
            ],
        )

    def test_seed_user_home_search_profiles_command_is_idempotent(self):
        searchSeedUsernames = self.get_search_seed_usernames()
        call_command('seed_user_home_search_profiles')

        firstUsersCount = self.user_model.objects.filter(username__in=searchSeedUsernames).count()
        firstProfilesCount = PlatformProfile.objects.filter(
            platform_user__username__in=searchSeedUsernames
        ).count()

        seededUser = self.user_model.objects.get(username='search_seed_alex')
        seededProfile = PlatformProfile.objects.get(platform_user=seededUser)
        seededUser.email = 'changed.temp@sky.com'
        seededUser.save(update_fields=['email'])
        seededProfile.team_role = 'Temporary Role'
        seededProfile.save(update_fields=['team_role'])

        call_command('seed_user_home_search_profiles')

        secondUsersCount = self.user_model.objects.filter(username__in=searchSeedUsernames).count()
        secondProfilesCount = PlatformProfile.objects.filter(
            platform_user__username__in=searchSeedUsernames
        ).count()

        self.assertEqual(firstUsersCount, 5)
        self.assertEqual(firstProfilesCount, 5)
        self.assertEqual(secondUsersCount, 5)
        self.assertEqual(secondProfilesCount, 5)

        seededUser.refresh_from_db()
        seededProfile.refresh_from_db()
        self.assertEqual(seededUser.email, 'search.alex@sky.com')
        self.assertEqual(seededProfile.team_role, 'Platform Strategist')

    def test_user_home_search_endpoint_returns_all_five_seed_profiles_for_search_seed_query(self):
        call_command('seed_user_home_search_profiles')
        self.client.force_login(self.regular_user)

        response = self.client.get(
            reverse('login_page:user_home_search'),
            {'query': 'search_seed'},
        )

        self.assertEqual(response.status_code, 200)
        results = response.json()['results']
        self.assertEqual(len(results), 5)
        self.assertCountEqual(
            [resultItem['full_name'] for resultItem in results],
            [
                'Alex Meridian',
                'Nora Skylark',
                'Ilya North',
                'Marta Vale',
                'Danylo Crest',
            ],
        )

    def test_user_home_search_endpoint_excludes_users_without_profiles(self):
        call_command('seed_user_home_search_profiles')
        self.user_model.objects.create_user(
            username='search_seed_ghost',
            email='search.ghost@sky.com',
            password='ghost-pass-2026',
            user_type='user',
        )
        self.client.force_login(self.regular_user)

        response = self.client.get(
            reverse('login_page:user_home_search'),
            {'query': 'search_seed'},
        )

        self.assertEqual(response.status_code, 200)
        results = response.json()['results']
        self.assertEqual(len(results), 5)
        self.assertNotIn('search_seed_ghost', [resultItem['full_name'] for resultItem in results])

    def test_user_home_search_endpoint_matches_seeded_name_role_team_and_department(self):
        call_command('seed_user_home_search_profiles')
        self.client.force_login(self.regular_user)

        searchCases = [
            ('meridian', 'Alex Meridian'),
            ('strategist', 'Alex Meridian'),
            ('orion', 'Alex Meridian'),
            ('atlas', 'Alex Meridian'),
        ]

        for queryValue, expectedFullName in searchCases:
            response = self.client.get(
                reverse('login_page:user_home_search'),
                {'query': queryValue},
            )
            self.assertEqual(response.status_code, 200)
            results = response.json()['results']
            self.assertTrue(
                any(resultItem['full_name'] == expectedFullName for resultItem in results),
                msg=f'Expected {expectedFullName} in search results for query "{queryValue}"',
            )

    def test_user_home_quick_tools_endpoint_persists_slot_state(self):
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:user_home_quick_tools'),
            data=json.dumps({'slot_state': self.get_quick_tools_slot_state_payload()}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()['slot_state'],
            self.get_quick_tools_slot_state_payload(),
        )
        self.assertEqual(
            PlatformDashboardQuickToolSlot.objects.filter(platform_user=self.regular_user).count(),
            2,
        )

        homeResponse = self.client.get(reverse('login_page:user_home'))
        self.assertEqual(
            homeResponse.context['user_home_quick_tool_slot_state'],
            self.get_quick_tools_slot_state_payload(),
        )

    def test_user_home_quick_tools_endpoint_rejects_invalid_tool_id(self):
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('login_page:user_home_quick_tools'),
            data=json.dumps({'slot_state': ['tile-1', 'tile-999', None]}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid tool id', response.json()['message'])
        self.assertEqual(
            PlatformDashboardQuickToolSlot.objects.filter(platform_user=self.regular_user).count(),
            0,
        )

    def test_admin_side_uses_admin_side_template(self):
        self.client.force_login(self.admin_user)

        response = self.client.get(reverse('login_page:admin_side'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page/admin_side.html')

    def test_admin_profile_post_redirects_to_admin_side(self):
        self.client.force_login(self.admin_user)

        response = self.client.post(
            reverse('login_page:profile'),
            self.get_new_account_payload(),
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('login_page:admin_side'))

    def test_password_reset_changes_password_in_database(self):
        oldPasswordHash = self.regular_user.password
        response = self.client.post(
            reverse('login_page:password_reset'),
            {
                'email': self.regular_user.email,
                'new_password': 'Updated-pass-2026!',
                'confirm_password': 'Updated-pass-2026!',
            },
        )

        self.regular_user.refresh_from_db()
        passwordHistoryEntry = PlatformPasswordHistory.objects.get(platform_user=self.regular_user)

        self.assertEqual(response.status_code, 302)
        self.assertTrue(self.regular_user.check_password('Updated-pass-2026!'))
        self.assertEqual(passwordHistoryEntry.old_password_hash, oldPasswordHash)
        self.assertNotEqual(passwordHistoryEntry.new_password_hash, 'Updated-pass-2026!')
        self.assertTrue(check_password('Updated-pass-2026!', passwordHistoryEntry.new_password_hash))
        self.assertEqual(
            response.url,
            f"{reverse('login_page:login_page')}?password_reset=success",
        )

    def test_password_reset_rejects_current_password_reuse(self):
        currentPasswordValue = 'Current-pass-2026!'
        self.regular_user.set_password(currentPasswordValue)
        self.regular_user.save()

        response = self.client.post(
            reverse('login_page:password_reset'),
            {
                'email': self.regular_user.email,
                'new_password': currentPasswordValue,
                'confirm_password': currentPasswordValue,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            'Please choose a new password different from the current one.',
        )

    def test_password_reset_with_unknown_email_returns_error(self):
        response = self.client.post(
            reverse('login_page:password_reset'),
            {
                'email': 'unknown@sky.com',
                'new_password': 'Updated-pass-2026!',
                'confirm_password': 'Updated-pass-2026!',
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'No account was found for this e-mail.')

    def test_password_reset_logo_link_points_to_login_for_anonymous(self):
        response = self.client.get(reverse('login_page:password_reset'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            f'href="{reverse("login_page:login_page")}" class="return_to_login"',
        )

    def test_password_reset_logo_link_points_to_dashboard_for_authenticated_user(self):
        self.client.force_login(self.admin_user)

        response = self.client.get(reverse('login_page:password_reset'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            f'href="{reverse("login_page:admin_side")}" class="return_to_login"',
        )

    def test_sign_up_with_existing_username_returns_error(self):
        response = self.client.post(
            reverse('login_page:sign_up'),
            {
                'username': self.regular_user.username,
                'email': 'another@sky.com',
                'password': 'another-pass-2026',
                'confirm_password': 'another-pass-2026',
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()['message'],
            'This username is already in use.',
        )

    def test_anonymous_users_cannot_access_profile(self):
        response = self.client.get(reverse('login_page:profile'))

        self.assertEqual(response.status_code, 302)

    def test_anonymous_users_can_access_account(self):
        response = self.client.get(reverse('login_page:account'))

        self.assertEqual(response.status_code, 200)

    def test_anonymous_users_cannot_access_user_home(self):
        response = self.client.get(reverse('login_page:user_home'))

        self.assertEqual(response.status_code, 302)

    def test_anonymous_users_cannot_access_admin_side(self):
        response = self.client.get(reverse('login_page:admin_side'))

        self.assertEqual(response.status_code, 302)

    def test_non_admin_users_are_blocked_from_admin_side(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse('login_page:admin_side'))

        self.assertEqual(response.status_code, 403)

    def test_staff_user_without_admin_role_still_gets_admin_redirect(self):
        staff_user = self.user_model.objects.create_user(
            username='staffonly',
            email='staffonly@sky.com',
            password='staffonly-pass-2026',
            is_staff=True,
        )

        response = self.client.post(
            reverse('login_page:sign_in'),
            {
                'email': staff_user.email,
                'password': 'staffonly-pass-2026',
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()['redirect_to'],
            reverse('login_page:admin_side'),
        )
