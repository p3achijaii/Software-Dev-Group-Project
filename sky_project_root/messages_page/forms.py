from django import forms

from .models import Message


class MessageForm(forms.ModelForm):
    class Meta:
        model = Message
        fields = ['recipient', 'subject', 'body']
        widgets = {
            'recipient': forms.Select(attrs={'class': 'form-input'}),
            'subject': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Subject',
            }),
            'body': forms.Textarea(attrs={
                'class': 'form-textarea',
                'rows': 8,
                'placeholder': 'Write your message here...',
            }),
        }
