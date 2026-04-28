from django import template

register = template.Library()

_COLOR_TO_DEPT = {
    "pink": "xtv",
    "indigo": "native",
    "blue": "mobile",
    "orange": "web",
    "green": "data",
    "purple": "platform",
}


@register.filter(name="color_to_dept")
def color_to_dept(value):
    return _COLOR_TO_DEPT.get(value, "xtv")


@register.filter(name="initials")
def initials(value):
    if not value:
        return ""
    parts = str(value).split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0]).upper()
    return value[:2].upper()


@register.filter(name="dept_class")
def dept_class(value):
    if not value:
        return "dept-default"
    slug = str(value).lower().replace(" ", "-").replace("&", "and")
    return f"dept-{slug}"
