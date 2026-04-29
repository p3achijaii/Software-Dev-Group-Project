from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from ...models import PlatformProfile
from ...services import get_or_create_platform_team_for_profile_data

DEMO_SEARCH_PASSWORD = 'Search-demo-pass-2026!'
SEARCH_SEED_PROFILES = [
    {
        'username': 'search_seed_alex',
        'email': 'search.alex@sky.com',
        'full_name': 'Alex Meridian',
        'date_of_birth': date(1998, 2, 11),
        'gender': 'Male',
        'phone_number': '+34 600 111111',
        'status': 'Available',
        'team_name': 'Orion Crew',
        'team_role': 'Platform Strategist',
        'department_name': 'Atlas Department',
        'department_head': 'Selin Vega',
        'member_skills': 'Search Mapping | Workflow Planning',
    },
    {
        'username': 'search_seed_nora',
        'email': 'search.nora@sky.com',
        'full_name': 'Nora Skylark',
        'date_of_birth': date(1997, 7, 4),
        'gender': 'Female',
        'phone_number': '+34 600 222222',
        'status': 'Busy',
        'team_name': 'Nebula Hub',
        'team_role': 'Quality Pathfinder',
        'department_name': 'Vector Department',
        'department_head': 'Arsen Drift',
        'member_skills': 'Quality Assurance | Process Documentation',
    },
    {
        'username': 'search_seed_ilya',
        'email': 'search.ilya@sky.com',
        'full_name': 'Ilya North',
        'date_of_birth': date(1996, 11, 20),
        'gender': 'Male',
        'phone_number': '+34 600 333333',
        'status': 'Working Remotely',
        'team_name': 'Zenith Squad',
        'team_role': 'Data Cartographer',
        'department_name': 'Helios Department',
        'department_head': 'Lina Crest',
        'member_skills': 'Data Analysis | Reporting',
    },
    {
        'username': 'search_seed_marta',
        'email': 'search.marta@sky.com',
        'full_name': 'Marta Vale',
        'date_of_birth': date(1995, 9, 14),
        'gender': 'Female',
        'phone_number': '+34 600 444444',
        'status': 'Available',
        'team_name': 'Aurora Unit',
        'team_role': 'Ops Navigator',
        'department_name': 'Lumen Department',
        'department_head': 'Victor Hale',
        'member_skills': 'Operations Planning | Coordination',
    },
    {
        'username': 'search_seed_danylo',
        'email': 'search.danylo@sky.com',
        'full_name': 'Danylo Crest',
        'date_of_birth': date(1999, 1, 29),
        'gender': 'Male',
        'phone_number': '+34 600 555555',
        'status': 'Busy',
        'team_name': 'Comet Desk',
        'team_role': 'Support Sentinel',
        'department_name': 'Summit Department',
        'department_head': 'Mira Stone',
        'member_skills': 'Customer Support | Incident Handling',
    },
]


class Command(BaseCommand):
    help = 'Seeds five profile-backed users for user-home search validation.'

    def handle(self, *args, **options):
        user_model = get_user_model()
        createdUsersCount = 0
        updatedUsersCount = 0
        createdProfilesCount = 0
        updatedProfilesCount = 0

        for searchSeedProfile in SEARCH_SEED_PROFILES:
            usernameValue = searchSeedProfile['username']
            emailValue = searchSeedProfile['email']
            matchedUser = user_model.objects.filter(username__iexact=usernameValue).first()

            if matchedUser is None:
                matchedUser = user_model.objects.create_user(
                    username=usernameValue,
                    email=emailValue,
                    password=DEMO_SEARCH_PASSWORD,
                    user_type='user',
                )
                if not matchedUser.is_active:
                    matchedUser.is_active = True
                    matchedUser.save(update_fields=['is_active'])
                createdUsersCount += 1
            else:
                fieldsToUpdate = []
                if matchedUser.email != emailValue:
                    matchedUser.email = emailValue
                    fieldsToUpdate.append('email')
                if matchedUser.user_type != 'user':
                    matchedUser.user_type = 'user'
                    fieldsToUpdate.append('user_type')
                if not matchedUser.is_active:
                    matchedUser.is_active = True
                    fieldsToUpdate.append('is_active')
                matchedUser.set_password(DEMO_SEARCH_PASSWORD)
                fieldsToUpdate.append('password')

                if fieldsToUpdate:
                    matchedUser.save(update_fields=fieldsToUpdate)
                    updatedUsersCount += 1

            profileDefaults = {
                'full_name': searchSeedProfile['full_name'],
                'date_of_birth': searchSeedProfile['date_of_birth'],
                'gender': searchSeedProfile['gender'],
                'phone_number': searchSeedProfile['phone_number'],
                'status': searchSeedProfile['status'],
                'team_name': searchSeedProfile['team_name'],
                'team_role': searchSeedProfile['team_role'],
                'department_name': searchSeedProfile['department_name'],
                'department_head': searchSeedProfile['department_head'],
                'member_skills': searchSeedProfile['member_skills'],
            }
            profileDefaults['platform_team'] = get_or_create_platform_team_for_profile_data(
                searchSeedProfile['team_name'],
                fullName=searchSeedProfile['full_name'],
                departmentName=searchSeedProfile['department_name'],
                departmentHead=searchSeedProfile['department_head'],
                memberSkills=searchSeedProfile['member_skills'],
            )
            _, isCreated = PlatformProfile.objects.update_or_create(
                platform_user=matchedUser,
                defaults=profileDefaults,
            )
            if isCreated:
                createdProfilesCount += 1
            else:
                updatedProfilesCount += 1

        self.stdout.write(self.style.SUCCESS('Search seed profiles were applied successfully.'))
        self.stdout.write(
            'Users - created: {0}, updated: {1}'.format(createdUsersCount, updatedUsersCount)
        )
        self.stdout.write(
            'Profiles - created: {0}, updated: {1}'.format(
                createdProfilesCount,
                updatedProfilesCount,
            )
        )
        self.stdout.write('Shared demo password: {0}'.format(DEMO_SEARCH_PASSWORD))
