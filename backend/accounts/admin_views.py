from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdminOrSuperAdmin

from .models import UserProfile
from .serializers import UserProfileSerializer, UserCreateSerializer
from crm.models import Customer, Salesman
from crm.serializers import CustomerSerializer, SalesmanSerializer


class AdminCustomerViewSet(viewsets.ModelViewSet):
    """Convenience endpoints used by admin UI. Listing returns `UserProfile` data;
    creating will create the User (via UserCreateSerializer) and return the
    corresponding CRM `Customer` representation so the frontend has the correct
    customer id for subsequent CRM operations (delete/update).
    """
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    queryset = UserProfile.objects.filter(role='customer')
    serializer_class = UserProfileSerializer

    def create(self, request, *args, **kwargs):
        # Use the UserCreateSerializer to create the User and Profile
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Try to find the CRM Customer created by signals and return that
        try:
            customer = Customer.objects.get(user=user)
            out = CustomerSerializer(customer).data
            return Response(out, status=status.HTTP_201_CREATED)
        except Customer.DoesNotExist:
            # fallback: return the profile data
            profile = UserProfile.objects.get(user=user)
            return Response(UserProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


class AdminSalesmanViewSet(viewsets.ModelViewSet):
    """Convenience endpoints for admin UI. Creating returns the CRM Salesman
    representation so frontend can use the correct salesman id when calling
    CRM endpoints.
    """
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    queryset = UserProfile.objects.filter(role='salesman')
    serializer_class = UserProfileSerializer

    def create(self, request, *args, **kwargs):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        try:
            salesman = Salesman.objects.get(user=user)
            out = SalesmanSerializer(salesman).data
            return Response(out, status=status.HTTP_201_CREATED)
        except Salesman.DoesNotExist:
            profile = UserProfile.objects.get(user=user)
            return Response(UserProfileSerializer(profile).data, status=status.HTTP_201_CREATED)
