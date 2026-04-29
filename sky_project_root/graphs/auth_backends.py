from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User


class EmailOrUsernameBackend(ModelBackend):
    """Allow login with either email address or username."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None