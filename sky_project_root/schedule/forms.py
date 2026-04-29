from django import forms
from .models import Meeting

class MeetingForm(forms.ModelForm):
    class Meta:
        model = Meeting
        fields = ['title', 'date_time', 'platform', 'message', 'team']
        widgets = {
            'date_time': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
        }