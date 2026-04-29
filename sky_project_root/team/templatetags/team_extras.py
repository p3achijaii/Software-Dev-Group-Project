from django import template

register = template.Library()

@register.filter(name='dept_class')
def dept_class(value):
    if not value: return ""
    val = str(value).lower()
    if 'xtv' in val: return 'xtv'
    if 'native' in val: return 'native'
    if 'mobile' in val: return 'mobile'
    if 'reliability' in val: return 'reliability'
    if 'arch' in val: return 'arch'
    if 'programme' in val: return 'programme'
    return ""

@register.filter(name='initials')
def initials(value):
    """Returns the first letter of a name"""
    if not value:
        return "?"
    return str(value)[0].upper()