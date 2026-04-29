from django import forms
from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError

from .models import PlatformProfile

ALLOWED_PROFILE_IMAGE_CONTENT_TYPES = {
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
}
MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024


def get_reset_rule_errors(passwordValue):
    passwordRuleErrors = []
    hasLowercase = any(character.islower() for character in passwordValue)
    hasUppercase = any(character.isupper() for character in passwordValue)
    hasNumber = any(character.isdigit() for character in passwordValue)
    hasSpecial = any(not character.isalnum() for character in passwordValue)

    if len(passwordValue) < 8:
        passwordRuleErrors.append('Please place at least 8 characters.')

    if not (hasLowercase and hasUppercase):
        passwordRuleErrors.append('Please use a combination of uppercase and lowercase letters.')

    if not hasNumber:
        passwordRuleErrors.append('Please mix in some numbers.')

    if not hasSpecial:
        passwordRuleErrors.append('Please include at least one special character.')

    return passwordRuleErrors


class LoginForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(
            attrs={
                'id': 'login-email',
                'autocomplete': 'username',
                'required': 'required',
            }
        ),
    )
    password = forms.CharField(
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                'id': 'login-password',
                'autocomplete': 'current-password',
                'required': 'required',
            }
        ),
    )

    def clean_email(self):
        emailValue = self.cleaned_data['email'].strip().lower()
        return emailValue


class SignUpForm(forms.Form):
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(
            attrs={
                'id': 'sign-up-username',
                'autocomplete': 'username',
                'required': 'required',
            }
        ),
    )
    email = forms.EmailField(
        widget=forms.EmailInput(
            attrs={
                'id': 'sign-up-email',
                'autocomplete': 'email',
                'required': 'required',
            }
        ),
    )
    password = forms.CharField(
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                'id': 'sign-up-password',
                'autocomplete': 'new-password',
                'required': 'required',
            }
        ),
    )
    confirm_password = forms.CharField(
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                'id': 'sign-up-confirm-password',
                'autocomplete': 'new-password',
                'required': 'required',
            }
        ),
    )

    def clean_username(self):
        usernameValue = self.cleaned_data['username'].strip()
        user_model = get_user_model()

        if user_model.objects.filter(username__iexact=usernameValue).exists():
            raise forms.ValidationError('This username is already in use.')

        return usernameValue

    def clean_email(self):
        emailValue = self.cleaned_data['email'].strip().lower()
        user_model = get_user_model()

        if user_model.objects.filter(email__iexact=emailValue).exists():
            raise forms.ValidationError('This e-mail is already in use.')

        return emailValue

    def clean(self):
        cleaned_data = super().clean()
        passwordValue = cleaned_data.get('password')
        confirmPasswordValue = cleaned_data.get('confirm_password')

        if passwordValue and confirmPasswordValue and passwordValue != confirmPasswordValue:
            self.add_error('confirm_password', 'Passwords do not match.')

        if passwordValue:
            password_validation.validate_password(passwordValue)

        return cleaned_data


class NewAccountForm(forms.Form):
    full_name = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={'id': 'full-name', 'required': 'required'}),
    )
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={'id': 'account-username', 'required': 'required'}),
    )
    date_of_birth = forms.DateField(
        widget=forms.DateInput(
            attrs={'id': 'date-of-birth', 'type': 'date', 'required': 'required'}
        ),
    )
    gender = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={'id': 'gender-value', 'required': 'required'}),
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'id': 'account-email', 'required': 'required'}),
    )
    phone_number = forms.CharField(
        max_length=50,
        widget=forms.TextInput(attrs={'id': 'phone-number', 'required': 'required'}),
    )
    status = forms.CharField(
        max_length=100,
        widget=forms.TextInput(
            attrs={
                'id': 'status-value',
                'class': 'status',
                'readonly': 'readonly',
                'autocomplete': 'off',
                'aria-haspopup': 'dialog',
                'aria-expanded': 'false',
                'required': 'required',
            }
        ),
    )
    team_name = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={'id': 'team-name', 'required': 'required'}),
    )
    team_role = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={'id': 'team-role', 'required': 'required'}),
    )
    department_name = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={'id': 'department-name', 'required': 'required'}),
    )
    department_head = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={'id': 'department-head', 'required': 'required'}),
    )
    member_skills = forms.CharField(
        widget=forms.Textarea(
            attrs={
                'id': 'member-skills-input',
                'readonly': 'readonly',
                'aria-haspopup': 'dialog',
                'aria-expanded': 'false',
                'rows': '1',
                'required': 'required',
            }
        ),
    )
    profile_image = forms.FileField(
        required=False,
        widget=forms.ClearableFileInput(
            attrs={
                'id': 'profile-image-upload',
                'class': 'profile-image-input',
                'accept': 'image/jpeg,image/png,image/gif,image/webp',
            }
        ),
    )

    def __init__(self, platformUser, *args, **kwargs):
        self.platformUser = platformUser
        self.platformProfile = PlatformProfile.objects.filter(platform_user=self.platformUser).first()
        self.identity_fields_locked = self.platformProfile is not None
        super().__init__(*args, **kwargs)

        if self.identity_fields_locked:
            for fieldName in ('full_name', 'username', 'date_of_birth'):
                self.fields[fieldName].widget.attrs['readonly'] = 'readonly'
                self.fields[fieldName].widget.attrs['aria-readonly'] = 'true'

    def clean_full_name(self):
        fullNameValue = self.cleaned_data['full_name'].strip()
        if self.identity_fields_locked and self.platformProfile:
            return self.platformProfile.full_name

        return fullNameValue

    def clean_username(self):
        if self.identity_fields_locked:
            return self.platformUser.username

        usernameValue = self.cleaned_data['username'].strip()
        user_model = get_user_model()

        if user_model.objects.filter(username__iexact=usernameValue).exclude(pk=self.platformUser.pk).exists():
            raise forms.ValidationError('This username is already in use.')

        return usernameValue

    def clean_date_of_birth(self):
        if self.identity_fields_locked and self.platformProfile:
            return self.platformProfile.date_of_birth

        return self.cleaned_data['date_of_birth']

    def clean_email(self):
        emailValue = self.cleaned_data['email'].strip().lower()
        user_model = get_user_model()

        if user_model.objects.filter(email__iexact=emailValue).exclude(pk=self.platformUser.pk).exists():
            raise forms.ValidationError('This e-mail is already in use.')

        return emailValue

    def clean_profile_image(self):
        uploadedImage = self.cleaned_data.get('profile_image')
        if not uploadedImage:
            return uploadedImage

        contentType = (uploadedImage.content_type or '').lower()
        if contentType not in ALLOWED_PROFILE_IMAGE_CONTENT_TYPES:
            raise forms.ValidationError('Please upload a JPG, PNG, GIF, or WEBP image.')

        if uploadedImage.size > MAX_PROFILE_IMAGE_SIZE_BYTES:
            raise forms.ValidationError('Please upload an image smaller than 5MB.')

        return uploadedImage


class BaseAccountDetailsForm(forms.Form):
    full_name = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={'id': 'account-full-name', 'required': 'required'}),
    )
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={'id': 'account-username', 'required': 'required'}),
    )
    date_of_birth = forms.DateField(
        widget=forms.DateInput(
            attrs={'id': 'account-date-of-birth', 'type': 'date', 'required': 'required'}
        ),
    )
    gender = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={'id': 'account-gender', 'required': 'required'}),
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'id': 'account-email', 'required': 'required'}),
    )
    phone_number = forms.CharField(
        max_length=50,
        widget=forms.TextInput(attrs={'id': 'account-phone-number', 'required': 'required'}),
    )
    status = forms.CharField(
        max_length=100,
        widget=forms.TextInput(
            attrs={
                'id': 'account-status',
                'class': 'status',
                'readonly': 'readonly',
                'autocomplete': 'off',
                'aria-haspopup': 'dialog',
                'aria-expanded': 'false',
                'required': 'required',
            }
        ),
    )
    team_name = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={'id': 'account-team-name', 'required': 'required'}),
    )
    team_role = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={'id': 'account-team-role', 'required': 'required'}),
    )
    department_name = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={'id': 'account-department-name', 'required': 'required'}),
    )
    department_head = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={'id': 'account-department-head', 'required': 'required'}),
    )
    member_skills = forms.CharField(
        widget=forms.Textarea(
            attrs={
                'id': 'member-skills-input',
                'readonly': 'readonly',
                'aria-haspopup': 'dialog',
                'aria-expanded': 'false',
                'rows': '1',
                'required': 'required',
            }
        ),
    )

    def get_current_user(self):
        return None

    def clean_username(self):
        usernameValue = self.cleaned_data['username'].strip()
        user_model = get_user_model()
        existingUsers = user_model.objects.filter(username__iexact=usernameValue)
        currentUser = self.get_current_user()

        if currentUser is not None:
            existingUsers = existingUsers.exclude(pk=currentUser.pk)

        if existingUsers.exists():
            raise forms.ValidationError('This username is already in use.')

        return usernameValue

    def clean_email(self):
        emailValue = self.cleaned_data['email'].strip().lower()
        user_model = get_user_model()
        existingUsers = user_model.objects.filter(email__iexact=emailValue)
        currentUser = self.get_current_user()

        if currentUser is not None:
            existingUsers = existingUsers.exclude(pk=currentUser.pk)

        if existingUsers.exists():
            raise forms.ValidationError('This e-mail is already in use.')

        return emailValue


class AccountPageForm(BaseAccountDetailsForm):
    def __init__(self, platformUser, *args, **kwargs):
        self.platformUser = platformUser
        super().__init__(*args, **kwargs)

    def get_current_user(self):
        return self.platformUser


class AccountRegistrationForm(BaseAccountDetailsForm):
    password = forms.CharField(
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                'id': 'account-password',
                'autocomplete': 'new-password',
                'required': 'required',
            }
        ),
    )

    def clean_password(self):
        passwordValue = self.cleaned_data['password']

        if len(passwordValue) < 8:
            raise forms.ValidationError('Please place at least 8 characters.')

        return passwordValue


class InboxReplyForm(forms.Form):
    message_id = forms.IntegerField(
        min_value=1,
        widget=forms.HiddenInput(attrs={'id': 'inbox-message-id'}),
    )
    email_reply = forms.CharField(
        widget=forms.Textarea(
            attrs={
                'id': 'inbox-email-reply',
                'rows': '4',
                'required': 'required',
            }
        ),
    )

    def clean_email_reply(self):
        emailReplyValue = self.cleaned_data['email_reply'].strip()
        if not emailReplyValue:
            raise forms.ValidationError('Please add a reply before saving.')

        return emailReplyValue


class TeamSettingsForm(forms.Form):
    team_image = forms.FileField(required=False)
    key_contact_1 = forms.CharField(max_length=255, required=False)
    key_contact_2 = forms.CharField(max_length=255, required=False)
    jira_project_name = forms.CharField(max_length=255, required=False)
    jira_board_link = forms.CharField(max_length=500, required=False)
    git_project_name = forms.CharField(max_length=255, required=False)
    github_link = forms.CharField(max_length=500, required=False)
    dependency_name = forms.CharField(max_length=255, required=False)
    dependency_type = forms.CharField(max_length=50, required=False)
    software_owned = forms.CharField(max_length=255, required=False)
    versioning_approaches = forms.CharField(max_length=255, required=False)
    wiki_link = forms.CharField(max_length=500, required=False)
    wiki_search_terms = forms.CharField(max_length=255, required=False)
    slack_channels = forms.CharField(max_length=500, required=False)
    slack_link = forms.CharField(max_length=500, required=False)
    daily_standup_time = forms.TimeField(required=False)
    daily_standup_link = forms.CharField(max_length=500, required=False)
    about_team = forms.CharField(required=False, widget=forms.Textarea)
    key_skills = forms.CharField(required=False, widget=forms.Textarea)
    focus_areas = forms.CharField(required=False, widget=forms.Textarea)

    def clean_dependency_type(self):
        dependencyTypeValue = self.cleaned_data.get('dependency_type', '').strip().lower()
        if dependencyTypeValue in {'', 'upstream', 'downstream'}:
            return dependencyTypeValue

        raise forms.ValidationError('Dependency type must be upstream or downstream.')

    def clean_team_image(self):
        uploadedImage = self.cleaned_data.get('team_image')
        if not uploadedImage:
            return uploadedImage

        contentType = (uploadedImage.content_type or '').lower()
        if contentType not in ALLOWED_PROFILE_IMAGE_CONTENT_TYPES:
            raise forms.ValidationError('Please upload a JPG, PNG, GIF, or WEBP image.')

        if uploadedImage.size > MAX_PROFILE_IMAGE_SIZE_BYTES:
            raise forms.ValidationError('Please upload an image smaller than 5MB.')

        return uploadedImage


class ResetPasswordForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'id': 'reset-email', 'required': 'required'}),
    )
    new_password = forms.CharField(
        strip=False,
        widget=forms.PasswordInput(
            attrs={'id': 'new-password', 'autocomplete': 'new-password', 'required': 'required'}
        ),
    )
    confirm_password = forms.CharField(
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                'id': 'confirm-password',
                'autocomplete': 'new-password',
                'required': 'required',
            }
        ),
    )

    def clean_email(self):
        emailValue = self.cleaned_data['email'].strip().lower()
        user_model = get_user_model()
        matchedUser = user_model.objects.filter(email__iexact=emailValue).first()

        if matchedUser is None:
            raise forms.ValidationError('No account was found for this e-mail.')

        self.matchedUser = matchedUser
        return emailValue

    def clean(self):
        cleaned_data = super().clean()
        passwordValue = cleaned_data.get('new_password')
        confirmPasswordValue = cleaned_data.get('confirm_password')
        matchedUser = getattr(self, 'matchedUser', None)

        if passwordValue and confirmPasswordValue and passwordValue != confirmPasswordValue:
            self.add_error('confirm_password', 'Passwords do not match.')

        if passwordValue:
            for passwordRuleError in get_reset_rule_errors(passwordValue):
                self.add_error('new_password', passwordRuleError)

        if passwordValue and matchedUser:
            if matchedUser.check_password(passwordValue):
                self.add_error('new_password', 'Please choose a new password different from the current one.')

        if passwordValue and matchedUser:
            try:
                password_validation.validate_password(passwordValue, matchedUser)
            except ValidationError as validationError:
                for errorMessage in validationError.messages:
                    self.add_error('new_password', errorMessage)

        return cleaned_data
