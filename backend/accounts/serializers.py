from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import UserProfile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')

class UserProfileSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    user = UserSerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model = UserProfile
        fields = (
            'id', 'user', 'username', 'email', 'first_name', 'last_name', 'role',
            'phone', 'address', 'city', 'country', 'created_at', 'updated_at'
        )

class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for Admins to create users manually."""
    password = serializers.CharField(write_only=True)
    # ADDED write_only=True to all profile and salesman fields
    role = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES, write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, write_only=True)
    address = serializers.CharField(required=False, allow_blank=True, write_only=True)
    city = serializers.CharField(required=False, allow_blank=True, write_only=True)
    country = serializers.CharField(required=False, allow_blank=True, write_only=True)
    
    # sales-specific extras
    employee_id = serializers.CharField(required=False, allow_blank=True, write_only=True)
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, write_only=True)
    territory = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = (
            'username', 'email', 'password', 'first_name', 'last_name',
            'role', 'phone', 'address', 'city', 'country',
            'employee_id', 'commission_rate', 'territory'
        )

    def create(self, validated_data):
        role = validated_data.pop('role')
        phone = validated_data.pop('phone', '')
        address = validated_data.pop('address', '')
        city = validated_data.pop('city', '')
        country = validated_data.pop('country', '')

        # Pop sales-specific fields
        employee_id = validated_data.pop('employee_id', None)
        commission_rate = validated_data.pop('commission_rate', None)
        territory = validated_data.pop('territory', None)

        # Create Core User
        user = User.objects.create_user(**validated_data)

        # Update Profile (Signal already created it, we just update details)
        profile = UserProfile.objects.get(user=user)
        profile.role = role
        profile.phone = phone
        profile.address = address
        profile.city = city
        profile.country = country
        profile.save() # This triggers the CRM sync signal

        # If the role is salesman and the caller provided sales fields, update the
        # related Salesman object that the signal created.
        if role == 'salesman':
            try:
                from crm.models import Salesman
            except ImportError:
                Salesman = None

            if Salesman:
                try:
                    salesman = Salesman.objects.get(user=user)
                except Salesman.DoesNotExist:
                    salesman = None

                if salesman:
                    # only set attributes that were provided
                    if employee_id:
                        salesman.employee_id = employee_id
                    if commission_rate is not None:
                        salesman.commission_rate = commission_rate
                    if territory:
                        salesman.territory = territory
                    salesman.save()

        return user
        
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    access = serializers.SerializerMethodField(read_only=True)
    refresh = serializers.SerializerMethodField(read_only=True)
    role = serializers.SerializerMethodField(read_only=True)

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if user.is_active:
                    refresh = RefreshToken.for_user(user)
                    profile, _ = UserProfile.objects.get_or_create(user=user)
                    
                    self.context['user'] = user
                    self.context['refresh'] = refresh
                    self.context['role'] = profile.role
                else:
                    raise serializers.ValidationError('User account is disabled.')
            else:
                raise serializers.ValidationError('Invalid credentials.')
        else:
            raise serializers.ValidationError('Must include username and password.')
        return data

    def get_access(self, obj):
        return str(self.context.get('refresh').access_token) if self.context.get('refresh') else None

    def get_refresh(self, obj):
        return str(self.context.get('refresh')) if self.context.get('refresh') else None

    def get_role(self, obj):
        return self.context.get('role')