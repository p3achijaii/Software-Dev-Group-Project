from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render

from .forms import MessageForm
from .models import Message


@login_required
def inbox(request):
    search_query = request.GET.get('search', '').strip()
    inbox_list = Message.objects.filter(recipient=request.user, is_draft=False).order_by('-sent_at')

    if search_query:
        inbox_list = inbox_list.filter(
            Q(subject__icontains=search_query) |
            Q(body__icontains=search_query) |
            Q(sender__username__icontains=search_query) |
            Q(sender__first_name__icontains=search_query) |
            Q(sender__last_name__icontains=search_query) |
            Q(sender__email__icontains=search_query)
        )

    sent_count = Message.objects.filter(sender=request.user, is_draft=False).count()
    drafts_count = Message.objects.filter(sender=request.user, is_draft=True).count()
    return render(request, 'messages_page/inbox.html', {
        'message_list': inbox_list,
        'active_tab': 'inbox',
        'inbox_count': inbox_list.count(),
        'sent_count': sent_count,
        'drafts_count': drafts_count,
        'search_query': search_query,
    })


@login_required
def sent_messages(request):
    search_query = request.GET.get('search', '').strip()
    sent_list = Message.objects.filter(sender=request.user, is_draft=False).order_by('-sent_at')

    if search_query:
        sent_list = sent_list.filter(
            Q(subject__icontains=search_query) |
            Q(body__icontains=search_query) |
            Q(recipient__username__icontains=search_query) |
            Q(recipient__first_name__icontains=search_query) |
            Q(recipient__last_name__icontains=search_query) |
            Q(recipient__email__icontains=search_query)
        )

    inbox_count = Message.objects.filter(recipient=request.user, is_draft=False).count()
    drafts_count = Message.objects.filter(sender=request.user, is_draft=True).count()
    return render(request, 'messages_page/sent_messages.html', {
        'message_list': sent_list,
        'active_tab': 'sent',
        'inbox_count': inbox_count,
        'sent_count': sent_list.count(),
        'drafts_count': drafts_count,
        'search_query': search_query,
    })


@login_required
def drafts(request):
    search_query = request.GET.get('search', '').strip()
    draft_list = Message.objects.filter(sender=request.user, is_draft=True).order_by('-sent_at')

    if search_query:
        draft_list = draft_list.filter(
            Q(subject__icontains=search_query) |
            Q(body__icontains=search_query) |
            Q(recipient__username__icontains=search_query) |
            Q(recipient__first_name__icontains=search_query) |
            Q(recipient__last_name__icontains=search_query) |
            Q(recipient__email__icontains=search_query)
        )

    inbox_count = Message.objects.filter(recipient=request.user, is_draft=False).count()
    sent_count = Message.objects.filter(sender=request.user, is_draft=False).count()
    return render(request, 'messages_page/drafts.html', {
        'message_list': draft_list,
        'active_tab': 'drafts',
        'inbox_count': inbox_count,
        'sent_count': sent_count,
        'drafts_count': draft_list.count(),
        'search_query': search_query,
    })


@login_required
def compose(request, pk=None):
    search_query = request.GET.get('search', '').strip()
    inbox_count = Message.objects.filter(recipient=request.user, is_draft=False).count()
    sent_count = Message.objects.filter(sender=request.user, is_draft=False).count()
    drafts_count = Message.objects.filter(sender=request.user, is_draft=True).count()
    draft_instance = None

    if pk is not None:
        draft_instance = get_object_or_404(Message, pk=pk, sender=request.user, is_draft=True)

    if request.method == 'POST':
        form = MessageForm(request.POST, instance=draft_instance)
        if form.is_valid():
            message = form.save(commit=False)
            message.sender = request.user
            message.is_draft = 'save_draft' in request.POST
            message.save()
            return redirect('messages_page:drafts' if message.is_draft else 'messages_page:sent_messages')
    else:
        form = MessageForm(instance=draft_instance)

    draft_list = Message.objects.filter(sender=request.user, is_draft=True).order_by('-sent_at')
    if search_query:
        draft_list = draft_list.filter(
            Q(subject__icontains=search_query) |
            Q(body__icontains=search_query) |
            Q(recipient__username__icontains=search_query) |
            Q(recipient__first_name__icontains=search_query) |
            Q(recipient__last_name__icontains=search_query) |
            Q(recipient__email__icontains=search_query)
        )

    return render(request, 'messages_page/compose.html', {
        'form': form,
        'active_tab': 'compose',
        'inbox_count': inbox_count,
        'sent_count': sent_count,
        'drafts_count': drafts_count,
        'message_list': draft_list,
        'search_query': search_query,
    })

@login_required
def message_detail(request, pk):
    message = get_object_or_404(Message, pk=pk)
    if request.user != message.sender and request.user != message.recipient:
        raise Http404
    if request.user == message.recipient and not message.is_read:
        message.is_read = True
        message.save(update_fields=['is_read'])
    search_query = request.GET.get('search', '').strip()
    if request.user == message.sender:
        active_tab = 'drafts' if message.is_draft else 'sent'
    else:
        active_tab = 'inbox'

    if active_tab == 'inbox':
        page_title = 'Inbox'
        page_desc = 'Messages you have received.'
        message_list = Message.objects.filter(recipient=request.user, is_draft=False).order_by('-sent_at')
        if search_query:
            message_list = message_list.filter(
                Q(subject__icontains=search_query) |
                Q(body__icontains=search_query) |
                Q(sender__username__icontains=search_query) |
                Q(sender__first_name__icontains=search_query) |
                Q(sender__last_name__icontains=search_query) |
                Q(sender__email__icontains=search_query)
            )
    elif active_tab == 'sent':
        page_title = 'Sent'
        page_desc = 'Messages you have sent.'
        message_list = Message.objects.filter(sender=request.user, is_draft=False).order_by('-sent_at')
        if search_query:
            message_list = message_list.filter(
                Q(subject__icontains=search_query) |
                Q(body__icontains=search_query) |
                Q(recipient__username__icontains=search_query) |
                Q(recipient__first_name__icontains=search_query) |
                Q(recipient__last_name__icontains=search_query) |
                Q(recipient__email__icontains=search_query)
            )
    else:
        page_title = 'Drafts'
        page_desc = 'Unsent messages you have saved as drafts.'
        message_list = Message.objects.filter(sender=request.user, is_draft=True).order_by('-sent_at')
        if search_query:
            message_list = message_list.filter(
                Q(subject__icontains=search_query) |
                Q(body__icontains=search_query) |
                Q(recipient__username__icontains=search_query) |
                Q(recipient__first_name__icontains=search_query) |
                Q(recipient__last_name__icontains=search_query) |
                Q(recipient__email__icontains=search_query)
            )

    inbox_count = Message.objects.filter(recipient=request.user, is_draft=False).count()
    sent_count = Message.objects.filter(sender=request.user, is_draft=False).count()
    drafts_count = Message.objects.filter(sender=request.user, is_draft=True).count()
    return render(request, 'messages_page/message_detail.html', {
        'message': message,
        'active_tab': active_tab,
        'page_title': page_title,
        'page_desc': page_desc,
        'inbox_count': inbox_count,
        'sent_count': sent_count,
        'drafts_count': drafts_count,
        'message_list': message_list,
        'search_query': search_query,
    })

