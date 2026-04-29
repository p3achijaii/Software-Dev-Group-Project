from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailAuthenticationBackend(ModelBackend):
    def authenticate(
        self,
        request,
        username=None,
        password=None,
        email=None,
        **kwargs,
    ):
        user_model = get_user_model()
        email_value = email or username

        if email_value is None or password is None:
            return None

        try:
            matchedUser = user_model._default_manager.get(email__iexact=email_value)
        except user_model.DoesNotExist:
            user_model().set_password(password)
            return None

        if matchedUser.check_password(password) and self.user_can_authenticate(matchedUser):
            return matchedUser

        return None
