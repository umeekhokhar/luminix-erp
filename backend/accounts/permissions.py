from rest_framework import permissions
from .models import UserProfile

class IsSuperAdmin(permissions.BasePermission):
    """Check if user is superadmin"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            profile = UserProfile.objects.get(user=request.user)
            return profile.role == 'superadmin'
        except UserProfile.DoesNotExist:
            return False

class IsShopAdmin(permissions.BasePermission):
    """Check if user is specifically a Shop Admin (Shopkeeper)"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            profile = UserProfile.objects.get(user=request.user)
            return profile.role == 'admin'
        except UserProfile.DoesNotExist:
            return False

class IsAdminOrSuperAdmin(permissions.BasePermission):
    """Check if user is admin or superadmin"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            profile = UserProfile.objects.get(user=request.user)
            return profile.role in ['admin', 'superadmin']
        except UserProfile.DoesNotExist:
            return False

class IsSalesman(permissions.BasePermission):
    """Check if user is salesman"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            profile = UserProfile.objects.get(user=request.user)
            return profile.role == 'salesman'
        except UserProfile.DoesNotExist:
            return False

class IsCustomer(permissions.BasePermission):
    """Check if user is customer"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            profile = UserProfile.objects.get(user=request.user)
            return profile.role == 'customer'
        except UserProfile.DoesNotExist:
            return False

class IsSalesmanOrAdmin(permissions.BasePermission):
    """Check if user is salesman or admin"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            profile = UserProfile.objects.get(user=request.user)
            return profile.role in ['salesman', 'admin', 'superadmin']
        except UserProfile.DoesNotExist:
            return False