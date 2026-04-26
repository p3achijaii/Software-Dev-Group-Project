"""
Management command to populate the database with real Sky Engineering team data
sourced from: Agile_Project_Module_UofW_-_Team_Registry.xlsx

Run with:  python manage.py seed_data
Safe to re-run — it clears old data first so seeding stays reproducible.
"""
import hashlib
from django.core.management.base import BaseCommand
from team.models import Department, Staff, Team, TeamMember
from organisation.models import DependencyType, TeamDependency


# ---------------------------------------------------------------------------
# Real department + team data from the Sky Engineering Team Registry
# ---------------------------------------------------------------------------

DEPARTMENTS = {
    'xTV_Web': {
        'head': 'Sebastian Holt',
        'teams': [
            ('Code Warriors', 'Olivia Carter', 'Infrastructure scalability, CI/CD integration, platform resilience'),
            ('The Debuggers', 'James Bennett', 'Advanced debugging tools, automated error detection, root cause analysis'),
            ('Bit Masters', 'Emma Richardson', 'Security compliance, encryption techniques, data integrity'),
            ('Agile Avengers', 'Benjamin Hayes', 'Agile transformation, workflow optimization, lean process improvement'),
            ('Syntax Squad', 'Sophia Mitchell', 'Automated deployment pipelines, release management, rollback strategies'),
            ('The Codebreakers', 'William Cooper', 'Cryptographic security, authentication protocols, secure APIs'),
            ('DevOps Dynasty', 'Isabella Ross', 'DevOps best practices, Kubernetes orchestration, cloud automation'),
            ('Byte Force', 'Elijah Parker', 'Cloud infrastructure, API gateway development, serverless architecture'),
            ('The Cloud Architects', 'Ava Sullivan', 'Cloud-native applications, distributed systems, multi-region deployments'),
            ('Full Stack Ninjas', 'Noah Campbell', 'Frontend and backend synchronization, API integration, UX/UI consistency'),
            ('The Error Handlers', 'Mia Henderson', 'Log aggregation, AI-driven anomaly detection, real-time monitoring'),
            ('Stack Overflow Survivors', 'Lucas Foster', 'Knowledge management, engineering playbooks, documentation automation'),
            ('The Binary Beasts', 'Charlotte Murphy', 'High-performance computing, low-latency data processing, algorithm efficiency'),
            ('API Avengers', 'Henry Ward', 'API security, authentication layers, API scalability'),
            ('The Algorithm Alliance', 'Amelia Brooks', 'Machine learning models, AI-driven analytics, data science applications'),
        ],
    },
    'Native TVs': {
        'head': 'Mason Briggs',
        'teams': [
            ('Data Wranglers', 'Alexander Perry', 'Big data engineering, real-time data streaming, database optimization'),
            ('The Sprint Kings', 'Evelyn Hughes', 'Agile backlog management, sprint retrospectives, delivery forecasting'),
            ('Exception Catchers', 'Daniel Scott', 'Fault tolerance, system resilience, disaster recovery planning'),
            ('Code Monkeys', 'Harper Lewis', 'Patch deployment, rollback automation, version control best practices'),
            ('The Compile Crew', 'Matthew Reed', 'Compiler optimization, static code analysis, build system improvements'),
            ('Git Good', 'Scarlett Edwards', 'Branching strategies, merge conflict resolution, Git best practices'),
            ('The CI/CD Squad', 'Jack Turner', 'Continuous integration, automated testing, deployment pipelines'),
            ('Bug Exterminators', 'Lily Phillips', 'Performance profiling, automated test generation, security patching'),
            ('The Agile Alchemists', 'Samuel Morgan', 'Agile maturity assessments, coaching & mentorship, SAFe/LeSS frameworks'),
            ('The Hotfix Heroes', 'Grace Patterson', 'Emergency response, rollback strategies, live system debugging'),
        ],
    },
    'Mobile': {
        'head': 'Violet Ramsey',
        'teams': [
            ('Cache Me Outside', 'Owen Barnes', 'Caching strategies, distributed cache systems, database query optimization'),
            ('The Scrum Lords', 'Chloe Hall', 'Agile training, sprint planning automation, process governance'),
            ('The 404 Not Found', 'Nathan Fisher', 'Error page personalization, debugging-as-a-service, incident response'),
            ('The Version Controllers', 'Zoey Stevens', 'GitOps workflows, repository security, automated versioning'),
            ('DevNull Pioneers', 'Caleb Bryant', 'Logging frameworks, observability enhancements, error handling APIs'),
            ('The Code Refactors', 'Hannah Simmons', 'Code maintainability, tech debt reduction, automated refactoring tools'),
            ('The Jenkins Juggernauts', 'Isaac Jenkins', 'CI/CD pipeline optimization, Jenkins plugin development, infrastructure as code'),
            ('Infinite Loopers', 'Madison Clarke', 'Frontend performance optimization, UI/UX consistency, component reusability'),
            ('The Feature Crafters', 'Gabriel Coleman', 'Feature flagging, A/B testing automation, rapid prototyping'),
            ('The Bit Manipulators', 'Riley Sanders', 'Binary data processing, encoding/decoding algorithms, compression techniques'),
            ('Kernel Crushers', 'Leo Watson', 'Low-level optimization, OS kernel tuning, hardware acceleration'),
            ('The Git Masters', 'Victoria Price', 'Git automation, monorepo strategies, repository analytics'),
            ('The API Explorers', 'Julian Bell', 'API documentation, API analytics, developer experience optimization'),
        ],
    },
    'Reliability_Tool': {
        'head': 'Lucy Vaughn',
        'teams': [
            ('The Lambda Legends', 'Layla Russell', 'Serverless architecture, event-driven development, microservice automation'),
            ('The Encryption Squad', 'Ethan Griffin', 'Cybersecurity research, cryptographic key management, secure data storage'),
            ('The UX Wizards', 'Aurora Cooper', 'Accessibility, user behavior analytics, UI/UX best practices'),
            ('The Hackathon Hustlers', 'Dylan Spencer', 'Rapid prototyping, proof-of-concept development, hackathon facilitation'),
            ('The Frontend Phantoms', 'Stella Martinez', 'Frontend frameworks, web performance tuning, component libraries'),
        ],
    },
    'Arch': {
        'head': 'Theodore Knox',
        'teams': [
            ('The Dev Dragons', 'Levi Bishop', 'API integrations, SDK development, plugin architecture'),
            ('The Microservice Mavericks', 'Eleanor Freeman', 'Microservice governance, inter-service communication, API gateways'),
        ],
    },
    'Programme': {
        'head': 'Bella Monroe',
        'teams': [
            ('The Quantum Coders', 'Hudson Ford', 'Quantum computing simulations, parallel processing, AI-assisted coding'),
        ],
    },
}


# ---------------------------------------------------------------------------
# Dependencies from the spreadsheet's "Downstream Dependencies" column
# Format: (from_team, to_team, direction)
# ---------------------------------------------------------------------------

DEPENDENCIES = [
    ('Code Warriors', 'The Debuggers', 'downstream'),
    ('The Debuggers', 'Bit Masters', 'downstream'),
    ('Bit Masters', 'API Avengers', 'downstream'),
    ('Agile Avengers', 'The Sprint Kings', 'downstream'),
    ('Syntax Squad', 'The Feature Crafters', 'downstream'),
    ('The Codebreakers', 'The Encryption Squad', 'downstream'),
    ('DevOps Dynasty', 'Code Warriors', 'downstream'),
    ('Byte Force', 'API Avengers', 'downstream'),
    ('The Cloud Architects', 'Byte Force', 'downstream'),
    ('The Cloud Architects', 'Cache Me Outside', 'downstream'),
    ('Full Stack Ninjas', 'The API Explorers', 'downstream'),
    ('The Error Handlers', 'The Debuggers', 'downstream'),
    ('Stack Overflow Survivors', 'The Scrum Lords', 'downstream'),
    ('The Binary Beasts', 'The Algorithm Alliance', 'downstream'),
    ('API Avengers', 'The Dev Dragons', 'downstream'),
    ('The Algorithm Alliance', 'The Codebreakers', 'downstream'),
    ('Data Wranglers', 'The Bit Manipulators', 'downstream'),
    ('The Sprint Kings', 'The Agile Alchemists', 'downstream'),
    ('Exception Catchers', 'The Debuggers', 'downstream'),
    ('Code Monkeys', 'The Version Controllers', 'downstream'),
    ('The Compile Crew', 'The Bit Manipulators', 'downstream'),
    ('Git Good', 'The Version Controllers', 'downstream'),
    ('The CI/CD Squad', 'Syntax Squad', 'downstream'),
    ('Bug Exterminators', 'The Debuggers', 'downstream'),
    ('The Agile Alchemists', 'Stack Overflow Survivors', 'downstream'),
    ('The Hotfix Heroes', 'The CI/CD Squad', 'downstream'),
    ('The Hotfix Heroes', 'Code Monkeys', 'downstream'),
    ('Cache Me Outside', 'The UX Wizards', 'downstream'),
    ('The Scrum Lords', 'The Sprint Kings', 'downstream'),
    ('The Scrum Lords', 'Agile Avengers', 'downstream'),
    ('The 404 Not Found', 'The Scrum Lords', 'downstream'),
    ('The Version Controllers', 'The Compile Crew', 'downstream'),
    ('The Version Controllers', 'The 404 Not Found', 'downstream'),
    ('DevNull Pioneers', 'The API Explorers', 'downstream'),
    ('The Code Refactors', 'Bug Exterminators', 'downstream'),
    ('The Jenkins Juggernauts', 'DevOps Dynasty', 'downstream'),
    ('The Jenkins Juggernauts', 'Git Good', 'downstream'),
    ('Infinite Loopers', 'The Feature Crafters', 'downstream'),
    ('The Feature Crafters', 'The Error Handlers', 'downstream'),
    ('The Feature Crafters', 'Syntax Squad', 'downstream'),
    ('The Bit Manipulators', 'The Binary Beasts', 'downstream'),
    ('Kernel Crushers', 'The API Explorers', 'downstream'),
    ('The Git Masters', 'The Version Controllers', 'downstream'),
    ('The API Explorers', 'Full Stack Ninjas', 'downstream'),
    ('The Lambda Legends', 'API Avengers', 'downstream'),
    ('The Encryption Squad', 'API Avengers', 'downstream'),
    ('The Encryption Squad', 'The API Explorers', 'downstream'),
    ('The UX Wizards', 'Full Stack Ninjas', 'downstream'),
    ('The UX Wizards', 'The Feature Crafters', 'downstream'),
    ('The Hackathon Hustlers', 'The UX Wizards', 'downstream'),
    ('The Frontend Phantoms', 'The API Explorers', 'downstream'),
    ('The Dev Dragons', 'The Feature Crafters', 'downstream'),
    ('The Microservice Mavericks', 'The Code Refactors', 'downstream'),
    ('The Microservice Mavericks', 'The Lambda Legends', 'downstream'),
    ('The Quantum Coders', 'Kernel Crushers', 'downstream'),
]


# ---------------------------------------------------------------------------
# Synthetic engineer names — the spreadsheet only lists team leaders, but
# the brief requires at least 5 engineers per team. These are placeholders.
# ---------------------------------------------------------------------------

FIRST_NAMES = [
    'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn',
    'Avery', 'Blake', 'Drew', 'Emery', 'Finley', 'Harper', 'Jamie', 'Kendall',
    'Lee', 'Marlowe', 'Nico', 'Peyton', 'Reese', 'Sage', 'Skyler', 'Tatum',
    'Uma', 'Val', 'Wren', 'Xen', 'Yael', 'Zara',
]

LAST_NAMES = [
    'Ahmed', 'Brown', 'Chen', 'Davis', 'Evans', 'Foster', 'Garcia', 'Harris',
    'Ibarra', 'Jones', 'Kim', 'Lopez', 'Martinez', 'Nguyen', 'Osei', 'Patel',
    'Quinn', 'Roberts', 'Singh', 'Taylor', 'Upton', 'Vance', 'Walsh', 'Xavier',
    'Young', 'Zhang',
]


def make_members(team_name, manager_name, count=5):
    """Return team_leader + (count-1) deterministic synthetic engineers."""
    members = [manager_name]
    seed = int(hashlib.md5(team_name.encode()).hexdigest(), 16)
    used = {manager_name}
    i = 0
    while len(members) < count:
        first = FIRST_NAMES[(seed + i * 7) % len(FIRST_NAMES)]
        last = LAST_NAMES[(seed + i * 13) % len(LAST_NAMES)]
        full = f'{first} {last}'
        if full not in used:
            members.append(full)
            used.add(full)
        i += 1
    return members


def make_staff(full_name, dept):
    """Split 'First Last' into a Staff record in the given department."""
    first, last = full_name.split(' ', 1)
    email = f'{first.lower()}.{last.lower().replace(" ", "")}@sky.com'
    return Staff.objects.create(
        firstName=first, lastName=last, emailAddress=email, department=dept
    )


class Command(BaseCommand):
    help = 'Seeds the database with real Sky Engineering data from the team registry.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Clearing existing data...')
        TeamDependency.objects.all().delete()
        TeamMember.objects.all().delete()
        Team.objects.all().delete()
        Staff.objects.all().delete()
        Department.objects.all().delete()
        DependencyType.objects.all().delete()

        # Dependency type lookup cache
        dep_type_cache = {}
        def get_dep_type(direction):
            if direction not in dep_type_cache:
                dep_type_cache[direction] = DependencyType.objects.create(
                    name=direction.capitalize()
                )
            return dep_type_cache[direction]

        self.stdout.write('Creating departments and teams...')
        team_objects = {}

        for dept_name, dept_info in DEPARTMENTS.items():
            # Create dept without leader first (Staff needs a dept FK)
            dept = Department.objects.create(departmentName=dept_name)

            # Department head → Staff record, then wire up dept.leader
            head_staff = make_staff(dept_info['head'], dept)
            dept.leader = head_staff
            dept.save()

            for team_name, manager_name, _purpose in dept_info['teams']:
                # Team leader — reuse head_staff if names match, else new Staff
                if manager_name == dept_info['head']:
                    leader_staff = head_staff
                else:
                    leader_staff = make_staff(manager_name, dept)

                team = Team.objects.create(
                    teamName=team_name,
                    department=dept,
                    teamLeader=leader_staff,
                )
                team_objects[team.teamName] = team

                # Team leader + 4 synthetic engineers = 5 members per team
                for member_name in make_members(team_name, manager_name, count=5):
                    if member_name == manager_name:
                        member_staff = leader_staff
                    else:
                        member_staff = make_staff(member_name, dept)
                    TeamMember.objects.create(team=team, staff=member_staff)

        self.stdout.write('Creating dependencies...')
        skipped = 0
        for from_name, to_name, direction in DEPENDENCIES:
            if from_name in team_objects and to_name in team_objects:
                TeamDependency.objects.create(
                    team=team_objects[from_name],
                    depends_on=team_objects[to_name],
                    dependency_type=get_dep_type(direction),
                )
            else:
                skipped += 1
                self.stdout.write(self.style.WARNING(
                    f'  Skipped: {from_name} -> {to_name} (team not found)'
                ))

        self.stdout.write(self.style.SUCCESS(
            f'\nDone!\n'
            f'  Departments : {Department.objects.count()}\n'
            f'  Staff       : {Staff.objects.count()}\n'
            f'  Teams       : {Team.objects.count()}\n'
            f'  Members     : {TeamMember.objects.count()}\n'
            f'  Dependencies: {TeamDependency.objects.count()}\n'
            f'  Skipped     : {skipped}'
        ))