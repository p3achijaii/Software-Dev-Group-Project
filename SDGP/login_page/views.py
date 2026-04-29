import json
from urllib.parse import urlencode

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404, redirect, render
from django.templatetags.static import static
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST, require_http_methods

from .forms import (
    AccountPageForm,
    AccountRegistrationForm,
    InboxReplyForm,
    LoginForm,
    NewAccountForm,
    ResetPasswordForm,
    SignUpForm,
    TeamSettingsForm,
)
from .models import PlatformAccount, PlatformInboxMessage, PlatformProfile, PlatformReport, PlatformTeam
from .services import (
    REPORT_DOC_CONTENT_TYPES,
    build_account_initial,
    build_data_visualisation_page_context,
    build_new_account_initial,
    build_organisation_page_context,
    build_report_file_name,
    build_reports_page_context,
    build_team_page_context,
    build_teams_page_context,
    build_user_home_context,
    create_user_home_schedule_event,
    create_platform_user,
    create_platform_user_from_account_form,
    delete_user_home_schedule_event,
    get_feedback_message,
    get_platform_report_for_user,
    get_user_home_compose_url,
    get_platform_profile,
    get_profile_image_data_url,
    get_redirect_to,
    get_user_home_inbox_messages,
    get_user_home_mailbox_state,
    get_user_home_schedule_event_state,
    hide_user_home_mailbox_message,
    is_admin_user,
    log_dashboard_activity,
    mark_user_home_inbox_messages_as_read,
    create_user_home_mailbox_message,
    render_chart_xlsx,
    render_report_pdf,
    render_report_xlsx,
    reset_platform_password,
    save_platform_account,
    save_platform_report,
    save_user_home_inbox_reply,
    save_platform_team_settings,
    serialize_user_home_inbox_message,
    serialize_user_home_schedule_event,
    save_platform_profile,
    save_user_home_quick_tool_slot_state,
    search_user_home_team_directory,
    search_user_home_people,
    update_user_home_schedule_event,
    validate_user_home_quick_tool_slot_state,
)


def login_page_view(request):
    if request.user.is_authenticated:
        return redirect(get_redirect_to(request.user))

    initialLoginFeedback = ''
    initialLoginFeedbackType = ''
    initialLoginEmail = request.GET.get('email', '').strip().lower()

    if request.GET.get('account_created') == 'success':
        initialLoginFeedback = 'Account created successfully. Please sign in.'
        initialLoginFeedbackType = 'is-success'
    elif request.GET.get('password_reset') == 'success':
        initialLoginFeedback = 'Password updated successfully. Please sign in.'
        initialLoginFeedbackType = 'is-success'

    return render(
        request,
        'login_page/login.html',
        {
            'initial_login_feedback': initialLoginFeedback,
            'initial_login_feedback_type': initialLoginFeedbackType,
            'login_form': LoginForm(initial={'email': initialLoginEmail}),
        },
    )


def logout_view(request):
    if request.user.is_authenticated:
        logout(request)

    return redirect(reverse('login_page:login_page'))


@require_POST
def sign_in_view(request):
    loginForm = LoginForm(request.POST)

    if not loginForm.is_valid():
        return JsonResponse(
            {'message': get_feedback_message(loginForm)},
            status=400,
        )

    matchedUser = authenticate(
        request,
        email=loginForm.cleaned_data['email'],
        password=loginForm.cleaned_data['password'],
    )

    if matchedUser is None:
        return JsonResponse(
            {'message': 'Wrong password or e-mail.'},
            status=400,
        )

    login(request, matchedUser)

    return JsonResponse(
        {
            'message': 'Login successful. Redirecting...',
            'redirect_to': get_redirect_to(matchedUser),
        }
    )


@require_POST
def sign_up_view(request):
    signUpForm = SignUpForm(request.POST)

    if not signUpForm.is_valid():
        return JsonResponse(
            {'message': get_feedback_message(signUpForm)},
            status=400,
        )

    createdUser = create_platform_user(signUpForm)
    login(
        request,
        createdUser,
        backend='django.contrib.auth.backends.ModelBackend',
    )

    return JsonResponse(
        {
            'message': 'Account created. Redirecting...',
            'redirect_to': get_redirect_to(createdUser),
        }
    )


@login_required
def user_home_view(request):
    userHomeContext = build_user_home_context(request.user)
    userHomeContext['user_home_quick_tool_url_map'] = {
        toolItem['id']: reverse(f"login_page:{toolItem['url_name']}")
        for toolItem in userHomeContext['user_home_quick_tools_catalog']
    }
    userHomeContext['user_home_search_url'] = reverse('login_page:user_home_search')
    userHomeContext['user_home_quick_tools_url'] = reverse('login_page:user_home_quick_tools')

    return render(
        request,
        'login_page/user_home.html',
        userHomeContext,
    )


@login_required
def admin_side_view(request):
    if not is_admin_user(request.user):
        return HttpResponseForbidden('You do not have access to this page.')

    return render(request, 'login_page/admin_side.html')


@login_required
def user_home_search_view(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed.'}, status=405)

    queryValue = request.GET.get('query', '')
    searchResults = search_user_home_people(queryValue)
    defaultAvatarUrl = static('login_page/images/default-profile.jpeg')

    return JsonResponse(
        {
            'results': [
                {
                    **resultItem,
                    'avatar_url': resultItem.get('avatar_url') or defaultAvatarUrl,
                    'mail_to': f"mailto:{resultItem['email']}",
                    'message_url': get_user_home_compose_url(resultItem['email']),
                }
                for resultItem in searchResults
            ]
        }
    )


@login_required
def user_home_team_directory_search_view(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed.'}, status=405)

    queryValue = request.GET.get('query', '')
    return JsonResponse(
        {
            'results': search_user_home_team_directory(queryValue),
        }
    )


@login_required
@require_POST
def user_home_quick_tools_view(request):
    try:
        requestData = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'message': 'Invalid JSON payload.'}, status=400)

    slotState = requestData.get('slot_state')
    normalizedSlotState, validationError = validate_user_home_quick_tool_slot_state(slotState)
    if validationError:
        return JsonResponse({'message': validationError}, status=400)

    savedSlotState = save_user_home_quick_tool_slot_state(
        request.user,
        normalizedSlotState,
    )
    return JsonResponse({'slot_state': savedSlotState})


def render_user_home_tool_placeholder(request, toolHeading, toolDescription):
    return render(
        request,
        'login_page/user_home_tool_placeholder.html',
        {
            'tool_heading': toolHeading,
            'tool_description': toolDescription,
            'dashboard_url': reverse('login_page:user_home'),
        },
    )


@login_required
def user_home_tool_message_view(request):
    if request.method == 'POST':
        inboxReplyForm = InboxReplyForm(request.POST)
        if inboxReplyForm.is_valid():
            savedMessage = save_user_home_inbox_reply(
                request.user,
                inboxReplyForm.cleaned_data['message_id'],
                inboxReplyForm.cleaned_data['email_reply'],
            )
            if savedMessage:
                inboxMessageUrl = reverse('login_page:user_home_tool_message')
                return redirect(f"{inboxMessageUrl}?message={savedMessage.id}&reply_saved=success")

        return redirect(reverse('login_page:user_home_tool_message'))

    mark_user_home_inbox_messages_as_read(request.user)
    inboxMessages = get_user_home_inbox_messages(request.user)
    composeToValue = request.GET.get('compose_to', '').strip()

    inboxPageContext = build_user_home_context(request.user)
    inboxPageContext.update(
        {
            'dashboard_url': reverse('login_page:user_home'),
            'inbox_messages': inboxMessages,
            'mailbox_state': get_user_home_mailbox_state(request.user),
            'inbox_action_url': reverse('login_page:user_home_tool_message_action'),
            'inbox_compose_prefill': {
                'recipient': composeToValue,
                'subject': request.GET.get('compose_subject', '').strip(),
                'body': request.GET.get('compose_body', '').strip(),
            },
            'user_home_search_url': reverse('login_page:user_home_search'),
        }
    )
    return render(request, 'login_page/inbox.html', inboxPageContext)


@login_required
@require_POST
def user_home_tool_message_action_view(request):
    try:
        requestData = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'message': 'Invalid JSON payload.'}, status=400)

    actionValue = (requestData.get('action') or '').strip()
    messageMode = (requestData.get('mode') or '').strip()
    draftType = (requestData.get('draft_type') or '').strip()
    recipientValue = (requestData.get('recipient') or '').strip()
    subjectValue = (requestData.get('subject') or '').strip()
    bodyValue = (requestData.get('body') or '').strip()
    previousMessageValue = (requestData.get('previous_message') or '').strip()

    if actionValue == 'delete':
        hiddenMessage = hide_user_home_mailbox_message(
            request.user,
            requestData.get('message_id'),
        )
        if hiddenMessage is None:
            return JsonResponse({'message': 'Inbox message was not found.'}, status=404)

        return JsonResponse(
            {
                'message_id': hiddenMessage['id'],
                'mode': hiddenMessage['mode'],
            }
        )

    allowedModes = {
        PlatformInboxMessage.MessageModeChoices.SENT,
        PlatformInboxMessage.MessageModeChoices.DRAFTS,
    }
    allowedDraftTypes = {
        PlatformInboxMessage.DraftTypeChoices.COMPOSE,
        PlatformInboxMessage.DraftTypeChoices.REPLY,
    }

    if actionValue not in {'send', 'save_draft'}:
        return JsonResponse({'message': 'Invalid inbox action.'}, status=400)

    if messageMode not in allowedModes:
        return JsonResponse({'message': 'Invalid inbox mode.'}, status=400)

    if draftType not in allowedDraftTypes:
        return JsonResponse({'message': 'Invalid draft type.'}, status=400)

    if actionValue == 'send' and not bodyValue:
        return JsonResponse({'message': 'Please add a message before saving.'}, status=400)

    if actionValue == 'save_draft' and not (recipientValue or subjectValue or bodyValue):
        return JsonResponse({'message': 'Please add draft details before saving.'}, status=400)

    sourceMessage = None
    if actionValue == 'send' and draftType == PlatformInboxMessage.DraftTypeChoices.REPLY:
        sourceMessage = save_user_home_inbox_reply(
            request.user,
            requestData.get('source_message_id'),
            bodyValue,
        )

    createdMessage = create_user_home_mailbox_message(
        request.user,
        messageMode,
        draftType,
        recipientValue,
        subjectValue,
        bodyValue,
        previousMessageValue,
    )

    return JsonResponse(
        {
            'message': serialize_user_home_inbox_message(createdMessage),
            'source_message': (
                serialize_user_home_inbox_message(sourceMessage)
                if sourceMessage
                else None
            ),
        }
    )


@login_required
def user_home_tool_report_view(request):
    platformProfile = get_platform_profile(request.user)
    generatedByName = (
        (platformProfile.full_name if platformProfile else '').strip()
        or request.user.get_full_name().strip()
        or request.user.username
    )
    reportPageContext = build_user_home_context(request.user)
    reportPageContext.update(
        {
            'dashboard_url': reverse('login_page:user_home'),
            'user_home_search_url': reverse('login_page:user_home_search'),
            **build_reports_page_context(request.user, generatedByName),
        }
    )
    return render(request, 'login_page/Reports.html', reportPageContext)


@login_required
def user_home_tool_organisation_view(request):
    return render(
        request,
        'login_page/Organisation.html',
        build_organisation_page_context(request.user),
    )


@login_required
def user_home_tool_data_view(request):
    return render(
        request,
        'login_page/Data.html',
        build_data_visualisation_page_context(request.user),
    )


@login_required
def user_home_tool_calendar_view(request):
    inboxUrl = reverse('login_page:user_home_tool_message')
    schedulePageContext = build_user_home_context(request.user)
    schedulePageContext.update(
        {
            'dashboard_url': reverse('login_page:user_home'),
            'schedule_default_date': timezone.localdate().isoformat(),
            'schedule_inbox_url': inboxUrl,
            'schedule_event_create_url': reverse('login_page:user_home_schedule_events'),
            'schedule_event_update_url_template': reverse(
                'login_page:user_home_schedule_event_update',
                kwargs={'event_id': 0},
            ),
            'schedule_event_delete_url_template': reverse(
                'login_page:user_home_schedule_event_delete',
                kwargs={'event_id': 0},
            ),
            'schedule_event_state': get_user_home_schedule_event_state(
                request.user,
                selectedDate=timezone.localdate(),
                detailUrl=inboxUrl,
            ),
            'schedule_csrf_token': get_token(request),
        }
    )
    return render(request, 'login_page/schedule.html', schedulePageContext)


@login_required
@require_POST
def user_home_schedule_events_view(request):
    try:
        requestData = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'message': 'Invalid JSON payload.'}, status=400)

    scheduleEvent, validationError = create_user_home_schedule_event(request.user, requestData)
    if validationError:
        return JsonResponse({'message': validationError}, status=400)

    inboxUrl = reverse('login_page:user_home_tool_message')
    scheduleEventState = get_user_home_schedule_event_state(
        request.user,
        selectedDate=timezone.localdate(),
        detailUrl=inboxUrl,
    )
    return JsonResponse(
        {
            'event': serialize_user_home_schedule_event(scheduleEvent, detailUrl=inboxUrl),
            'events': scheduleEventState,
        }
    )


@login_required
def user_home_tool_team_view(request):
    return render(
        request,
        'login_page/teams.html',
        build_teams_page_context(request.user),
    )


@login_required
def user_home_tool_team_detail_view(request, team_slug):
    platformTeam = get_object_or_404(PlatformTeam, slug=team_slug)

    if request.method == 'POST':
        teamSettingsForm = TeamSettingsForm(request.POST, request.FILES)
        if teamSettingsForm.is_valid():
            save_platform_team_settings(platformTeam, teamSettingsForm)

        return redirect(
            reverse(
                'login_page:user_home_tool_team_detail',
                kwargs={'team_slug': platformTeam.slug},
            )
        )

    return render(
        request,
        'login_page/team.html',
        build_team_page_context(request.user, platformTeam),
    )


def password_reset_view(request):
    resetFeedback = ''
    resetFeedbackType = ''
    initialEmail = request.GET.get('email', '').strip().lower()
    headerTargetUrl = (
        get_redirect_to(request.user)
        if request.user.is_authenticated
        else reverse('login_page:login_page')
    )

    if request.method == 'POST':
        resetPasswordForm = ResetPasswordForm(request.POST)

        if resetPasswordForm.is_valid():
            reset_platform_password(resetPasswordForm)
            return redirect(f"{reverse('login_page:login_page')}?password_reset=success")

        resetFeedback = get_feedback_message(resetPasswordForm)
        resetFeedbackType = 'is-error'
    else:
        resetPasswordForm = ResetPasswordForm(initial={'email': initialEmail})

    return render(
        request,
        'login_page/password_reset.html',
        {
            'reset_password_form': resetPasswordForm,
            'reset_feedback': resetFeedback,
            'reset_feedback_type': resetFeedbackType,
            'header_target_url': headerTargetUrl,
        },
    )


@login_required
def profile_view(request):
    platformProfile = get_platform_profile(request.user)
    profileExists = platformProfile is not None
    isNewMode = ((request.GET.get('mode') or '').strip().lower() == 'new') or not profileExists
    newAccountFeedback = ''
    newAccountFeedbackType = ''
    profileAvatarUrl = get_profile_image_data_url(platformProfile) or static('login_page/images/default-profile.jpeg')

    if request.method == 'POST':
        newAccountForm = NewAccountForm(request.user, request.POST, request.FILES)

        if newAccountForm.is_valid():
            save_platform_profile(request.user, newAccountForm)
            return redirect(get_redirect_to(request.user))

        newAccountFeedback = get_feedback_message(newAccountForm)
        newAccountFeedbackType = 'is-error'
    else:
        newAccountForm = NewAccountForm(
            request.user,
            initial=build_new_account_initial(request.user),
        )

    return render(
        request,
        'login_page/Profile.html',
        {
            'dashboard_url': (
                reverse('login_page:admin_side')
                if is_admin_user(request.user)
                else reverse('login_page:user_home')
            ),
            'new_account_feedback': newAccountFeedback,
            'new_account_feedback_type': newAccountFeedbackType,
            'new_account_form': newAccountForm,
            'new_account_heading': 'Add Profile' if isNewMode else 'Edit Profile',
            'new_account_submit_text': 'Create Profile' if isNewMode else 'Save Changes',
            'profile_avatar_url': profileAvatarUrl,
        },
    )


new_account_view = profile_view


def account_view(request):
    isRegistrationMode = not request.user.is_authenticated
    platformProfile = get_platform_profile(request.user) if request.user.is_authenticated else None
    profileAvatarUrl = (
        get_profile_image_data_url(platformProfile) or static('login_page/images/default-profile.jpeg')
    )
    accountExists = (
        request.user.is_authenticated
        and PlatformAccount.objects.filter(platform_user=request.user).exists()
    )
    accountFeedback = ''
    accountFeedbackType = ''

    if request.method == 'POST':
        if isRegistrationMode:
            accountForm = AccountRegistrationForm(request.POST)
        else:
            accountForm = AccountPageForm(request.user, request.POST)

        if accountForm.is_valid():
            if isRegistrationMode:
                createdUser = create_platform_user_from_account_form(accountForm)
                redirectQuery = urlencode(
                    {
                        'account_created': 'success',
                        'email': createdUser.email,
                    }
                )
                return redirect(f"{reverse('login_page:login_page')}?{redirectQuery}")

            save_platform_account(request.user, accountForm)
            return redirect(f"{reverse('login_page:account')}?saved=success")

        accountFeedback = get_feedback_message(accountForm)
        accountFeedbackType = 'is-error'
    else:
        if isRegistrationMode:
            accountForm = AccountRegistrationForm()
        else:
            accountForm = AccountPageForm(
                request.user,
                initial=build_account_initial(request.user),
            )

        if not isRegistrationMode and request.GET.get('saved') == 'success':
            accountFeedback = 'Account details saved successfully.'
            accountFeedbackType = 'is-success'

    return render(
        request,
        'login_page/account.html',
        {
            'dashboard_url': (
                reverse('login_page:login_page')
                if isRegistrationMode
                else (
                    reverse('login_page:admin_side')
                    if is_admin_user(request.user)
                    else reverse('login_page:user_home')
                )
            ),
            'account_feedback': accountFeedback,
            'account_feedback_type': accountFeedbackType,
            'account_form': accountForm,
            'account_heading': (
                'Create Account'
                if isRegistrationMode or not accountExists
                else 'Edit Account'
            ),
            'account_submit_text': (
                'Create Account'
                if isRegistrationMode or not accountExists
                else 'Save Changes'
            ),
            'account_back_link_text': (
                'Go back to sign in'
                if isRegistrationMode
                else 'Go back to the dashboard'
            ),
            'show_password_fields': isRegistrationMode,
            'profile_avatar_url': profileAvatarUrl,
        },
    )


def _stream_platform_report(platformReport):
    fileName = platformReport.file_name or build_report_file_name(
        platformReport.report_type,
        platformReport.doc_type,
        platformReport.title,
    )
    contentType = (
        platformReport.file_content_type
        or REPORT_DOC_CONTENT_TYPES.get(platformReport.doc_type, 'application/octet-stream')
    )

    response = HttpResponse(
        bytes(platformReport.file_blob or b''),
        content_type=contentType,
    )
    response['Content-Disposition'] = f'attachment; filename="{fileName}"'
    return response


def _build_report_payload_from_request(requestData, kindHint):
    payloadValue = requestData.get('payload') or {}
    titleValue = (requestData.get('title') or '').strip() or 'Untitled report'
    reportTypeValue = (requestData.get('report_type') or requestData.get('reportType') or '').strip()
    docTypeValue = (requestData.get('doc_type') or requestData.get('docType') or '').strip().lower()

    if docTypeValue not in {PlatformReport.DocTypeChoices.PDF, PlatformReport.DocTypeChoices.XLSX}:
        docTypeValue = (
            PlatformReport.DocTypeChoices.XLSX
            if kindHint == PlatformReport.KindChoices.CHART
            else PlatformReport.DocTypeChoices.PDF
        )

    return {
        'title': titleValue,
        'report_type': reportTypeValue or 'General',
        'doc_type': docTypeValue,
        'payload': payloadValue if isinstance(payloadValue, dict) else {},
    }


@login_required
@require_POST
def user_home_tool_report_save_view(request):
    try:
        requestData = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'message': 'Invalid JSON payload.'}, status=400)

    parsed = _build_report_payload_from_request(requestData, PlatformReport.KindChoices.REPORT)
    docTypeValue = parsed['doc_type']

    if docTypeValue == PlatformReport.DocTypeChoices.XLSX:
        fileBytes = render_report_xlsx(parsed['payload'])
    else:
        fileBytes = render_report_pdf(parsed['payload'])

    contentType = REPORT_DOC_CONTENT_TYPES[docTypeValue]
    fileName = build_report_file_name(parsed['report_type'], docTypeValue, parsed['title'])

    platformReport = save_platform_report(
        request.user,
        PlatformReport.KindChoices.REPORT,
        parsed['report_type'],
        docTypeValue,
        parsed['title'],
        parsed['payload'],
        fileBytes,
        contentType,
        fileName,
    )

    log_dashboard_activity(
        request.user,
        f'Generated {parsed["report_type"]} {docTypeValue.upper()} report',
        'report',
    )

    return JsonResponse({
        'report_id': platformReport.id,
        'file_name': fileName,
        'export_url': reverse(
            'login_page:user_home_tool_report_export',
            kwargs={'report_id': platformReport.id},
        ),
    })


@login_required
def user_home_tool_report_export_view(request, report_id):
    platformReport = get_platform_report_for_user(request.user, report_id)
    if platformReport is None or platformReport.kind != PlatformReport.KindChoices.REPORT:
        return JsonResponse({'message': 'Report was not found.'}, status=404)
    return _stream_platform_report(platformReport)


@login_required
@require_POST
def user_home_tool_data_save_view(request):
    try:
        requestData = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'message': 'Invalid JSON payload.'}, status=400)

    parsed = _build_report_payload_from_request(requestData, PlatformReport.KindChoices.CHART)
    docTypeValue = PlatformReport.DocTypeChoices.XLSX
    fileBytes = render_chart_xlsx(parsed['payload'])
    contentType = REPORT_DOC_CONTENT_TYPES[docTypeValue]
    fileName = build_report_file_name(parsed['report_type'], docTypeValue, parsed['title'])

    platformReport = save_platform_report(
        request.user,
        PlatformReport.KindChoices.CHART,
        parsed['report_type'],
        docTypeValue,
        parsed['title'],
        parsed['payload'],
        fileBytes,
        contentType,
        fileName,
    )

    log_dashboard_activity(
        request.user,
        f'Saved {parsed["report_type"]} chart',
        'report',
    )

    return JsonResponse({
        'report_id': platformReport.id,
        'file_name': fileName,
        'export_url': reverse(
            'login_page:user_home_tool_data_export',
            kwargs={'report_id': platformReport.id},
        ),
    })


@login_required
def user_home_tool_data_export_view(request, report_id):
    platformReport = get_platform_report_for_user(request.user, report_id)
    if platformReport is None or platformReport.kind != PlatformReport.KindChoices.CHART:
        return JsonResponse({'message': 'Chart was not found.'}, status=404)
    return _stream_platform_report(platformReport)


@login_required
@require_POST
def user_home_schedule_event_update_view(request, event_id):
    try:
        requestData = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'message': 'Invalid JSON payload.'}, status=400)

    scheduleEvent, validationError = update_user_home_schedule_event(
        request.user,
        event_id,
        requestData,
    )
    if validationError:
        statusCode = 404 if scheduleEvent is None and validationError == 'Event was not found.' else 400
        return JsonResponse({'message': validationError}, status=statusCode)

    inboxUrl = reverse('login_page:user_home_tool_message')
    scheduleEventState = get_user_home_schedule_event_state(
        request.user,
        selectedDate=timezone.localdate(),
        detailUrl=inboxUrl,
    )
    return JsonResponse({
        'event': serialize_user_home_schedule_event(scheduleEvent, detailUrl=inboxUrl),
        'events': scheduleEventState,
    })


@login_required
@require_POST
def user_home_schedule_event_delete_view(request, event_id):
    deleted, validationError = delete_user_home_schedule_event(request.user, event_id)
    if not deleted:
        return JsonResponse({'message': validationError or 'Event was not found.'}, status=404)

    inboxUrl = reverse('login_page:user_home_tool_message')
    scheduleEventState = get_user_home_schedule_event_state(
        request.user,
        selectedDate=timezone.localdate(),
        detailUrl=inboxUrl,
    )
    return JsonResponse({
        'event_id': int(event_id),
        'events': scheduleEventState,
    })
