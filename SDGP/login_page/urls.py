from django.urls import path

from . import views

app_name = 'login_page'

urlpatterns = [
    path('login/', views.login_page_view, name='login_page'),
    path('logout/', views.logout_view, name='logout'),
    path('login/sign-in/', views.sign_in_view, name='sign_in'),
    path('login/sign-up/', views.sign_up_view, name='sign_up'),
    path('login/password-reset/', views.password_reset_view, name='password_reset'),
    path('account/', views.account_view, name='account'),
    path('profile/', views.profile_view, name='profile'),
    path('new-account/', views.new_account_view, name='new_account'),
    path('user-home/', views.user_home_view, name='user_home'),
    path('user-home/search/', views.user_home_search_view, name='user_home_search'),
    path(
        'user-home/search/team-directory/',
        views.user_home_team_directory_search_view,
        name='user_home_team_directory_search',
    ),
    path('user-home/quick-tools/', views.user_home_quick_tools_view, name='user_home_quick_tools'),
    path('user-home/tools/message/', views.user_home_tool_message_view, name='user_home_tool_message'),
    path(
        'user-home/tools/message/action/',
        views.user_home_tool_message_action_view,
        name='user_home_tool_message_action',
    ),
    path('user-home/tools/report/', views.user_home_tool_report_view, name='user_home_tool_report'),
    path(
        'user-home/tools/report/save/',
        views.user_home_tool_report_save_view,
        name='user_home_tool_report_save',
    ),
    path(
        'user-home/tools/report/<int:report_id>/export/',
        views.user_home_tool_report_export_view,
        name='user_home_tool_report_export',
    ),
    path(
        'user-home/tools/organisation/',
        views.user_home_tool_organisation_view,
        name='user_home_tool_organisation',
    ),
    path('user-home/tools/data/', views.user_home_tool_data_view, name='user_home_tool_data'),
    path(
        'user-home/tools/data/save/',
        views.user_home_tool_data_save_view,
        name='user_home_tool_data_save',
    ),
    path(
        'user-home/tools/data/<int:report_id>/export/',
        views.user_home_tool_data_export_view,
        name='user_home_tool_data_export',
    ),
    path('user-home/tools/calendar/', views.user_home_tool_calendar_view, name='user_home_tool_calendar'),
    path(
        'user-home/tools/calendar/events/',
        views.user_home_schedule_events_view,
        name='user_home_schedule_events',
    ),
    path(
        'user-home/tools/calendar/events/<int:event_id>/update/',
        views.user_home_schedule_event_update_view,
        name='user_home_schedule_event_update',
    ),
    path(
        'user-home/tools/calendar/events/<int:event_id>/delete/',
        views.user_home_schedule_event_delete_view,
        name='user_home_schedule_event_delete',
    ),
    path('user-home/tools/team/', views.user_home_tool_team_view, name='user_home_tool_team'),
    path(
        'user-home/tools/team/<slug:team_slug>/',
        views.user_home_tool_team_detail_view,
        name='user_home_tool_team_detail',
    ),
    path('admin-side/', views.admin_side_view, name='admin_side'),
]
