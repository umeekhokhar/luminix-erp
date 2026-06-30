"""
Management command: seed_forecasting
Usage:  python manage.py seed_forecasting
Seeds the database with synthetic beverage data and runs the first forecast.
"""
from django.core.management.base import BaseCommand
from forecasting.seed_beverages import run as seed_run
from forecasting.engine import forecast_all_products


class Command(BaseCommand):
    help = 'Seed synthetic beverage data and generate initial demand forecasts'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('Step 1: Seeding synthetic data…'))
        seed_run()

        self.stdout.write(self.style.MIGRATE_HEADING('Step 2: Running forecasting engine…'))
        summary = forecast_all_products()
        self.stdout.write(self.style.SUCCESS(
            f'✓ Forecasts generated for {len(summary)} product(s).'
        ))
