import django.db.models.deletion
from django.db import migrations, models
from django.utils.text import slugify


def populate_slugs(apps, schema_editor):
    Team = apps.get_model('team', 'Team')
    for team in Team.objects.all():
        team.slug = slugify(team.teamName)
        team.save()


class Migration(migrations.Migration):

    dependencies = [
        ('team', '0006_developmentfocus_team_developmentfocus'),
    ]

    operations = [
        # Step 1: add slug without unique constraint so empty strings don't clash
        migrations.AddField(
            model_name='team',
            name='slug',
            field=models.SlugField(max_length=120, blank=True, default=''),
        ),
        # Step 2: fill in slugs for all existing rows
        migrations.RunPython(populate_slugs, migrations.RunPython.noop),
        # Step 3: now safe to enforce uniqueness
        migrations.AlterField(
            model_name='team',
            name='slug',
            field=models.SlugField(max_length=120, unique=True, blank=True),
        ),
        migrations.AlterField(
            model_name='teammember',
            name='staff',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='team_memberships', to='team.staff'),
        ),
        migrations.AlterField(
            model_name='teammember',
            name='team',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='members', to='team.team'),
        ),
        migrations.AlterField(
            model_name='teamskill',
            name='skill',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='skill_teams', to='team.skill'),
        ),
        migrations.AlterField(
            model_name='teamskill',
            name='team',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='team_skills', to='team.team'),
        ),
    ]