from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import update_session_auth_hash
from .models import UserProfile
from .serializers import UserProfileSerializer, LoginSerializer, UserCreateSerializer
from .permissions import IsSuperAdmin, IsShopAdmin

class AuthViewSet(viewsets.ViewSet):
    """Login Only - No Registration"""
    @action(detail=False, methods=['post'])
    def login(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
    
        if not user.check_password(old_password):
            return Response({"error": "Old password is incorrect"}, status=400)
    
        user.set_password(new_password)
        user.save()
        # This prevents the user from being logged out after password change
        update_session_auth_hash(request, user)
        return Response({"message": "Password updated successfully"})

    @action(detail=False, methods=['get', 'put'], permission_classes=[permissions.IsAuthenticated])
    def profile(self, request):
        if request.method == 'GET':
            # Serialize and return user data
            return Response({
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
            })
        
        if request.method == 'PUT':
            user = request.user
            user.email = request.data.get('email', user.email)
            user.first_name = request.data.get('first_name', user.first_name)
            user.last_name = request.data.get('last_name', user.last_name)
            user.save()
            return Response({"message": "Profile updated"})

class UserManagementViewSet(viewsets.ModelViewSet):
    """Handles User Creation Hierarchy"""
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Security: Filter what users can see
        user = self.request.user
        if not hasattr(user, 'userprofile'):
            return UserProfile.objects.none()
            
        role = user.userprofile.role

        if role == 'superadmin':
            return UserProfile.objects.all()
        elif role == 'admin':
            return UserProfile.objects.filter(role__in=['salesman', 'customer'])
        else:
            return UserProfile.objects.filter(user=user)

    # 1. SuperAdmin creates Shop Owner
    @action(detail=False, methods=['post'], permission_classes=[IsSuperAdmin])
    def create_admin(self, request):
        data = request.data.copy()
        data['role'] = 'admin'
        serializer = UserCreateSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # 2. Shop Admin creates Salesman
    @action(detail=False, methods=['post'], permission_classes=[IsShopAdmin])
    def create_salesman(self, request):
        data = request.data.copy()
        data['role'] = 'salesman'
        serializer = UserCreateSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # 3. Shop Admin creates Customer
    @action(detail=False, methods=['post'], permission_classes=[IsShopAdmin])
    def create_customer(self, request):
        data = request.data.copy()
        data['role'] = 'customer'
        serializer = UserCreateSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)