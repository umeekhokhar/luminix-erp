from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Customer, Salesman
from .serializers import CustomerSerializer, SalesmanSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if query:
            customers = Customer.objects.filter(name__icontains=query) | Customer.objects.filter(email__icontains=query)
        else:
            customers = Customer.objects.all()
        serializer = self.get_serializer(customers, many=True)
        return Response(serializer.data)


class SalesmanViewSet(viewsets.ModelViewSet):
    queryset = Salesman.objects.all()
    serializer_class = SalesmanSerializer
    permission_classes = [IsAuthenticated]
