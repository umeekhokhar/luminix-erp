"""
seed_beverages.py  –  Luminix ERP · AI Demand Forecasting Module
================================================================
Populates the database with:
  • 4 Vendors   : major Pakistani beverage distributors
  • 1 Category  : Beverages
  • 200 Products: realistic Pakistani beverage SKUs across
                  carbonated drinks, water, juices, energy drinks,
                  traditional sherbets, milk-based drinks, tea/coffee
  • Inventory   : stock levels per product
  • 12 months   : synthetic daily SaleRecord data with
                  realistic seasonal / weekly patterns

Run via management command:
    python manage.py seed_forecasting
"""

import random
from datetime import date, timedelta
from decimal import Decimal
import math

from inventory.models import Category, Vendor, Product, Inventory
from forecasting.models import SaleRecord, ForecastResult

# ─────────────────────────────────────────────
# 0. Constants
# ─────────────────────────────────────────────
random.seed(99)
TODAY      = date.today()
START_DATE = TODAY - timedelta(days=365)   # 12 months of history

# ─────────────────────────────────────────────
# 1. Vendors
# ─────────────────────────────────────────────
VENDORS_DATA = [
    {
        "name": "Lahore Beverages Co.",
        "email": "orders@lahorebeverages.pk",
        "phone": "+92-42-35123456",
        "address": "Plot 12, Quaid-e-Azam Industrial Estate",
        "city": "Lahore",
        "country": "Pakistan",
        "payment_terms": "Net 30",
    },
    {
        "name": "Karachi Drinks Distributors",
        "email": "supply@karachidrinksco.pk",
        "phone": "+92-21-32456789",
        "address": "Shed 7, SITE Industrial Area",
        "city": "Karachi",
        "country": "Pakistan",
        "payment_terms": "Net 15",
    },
    {
        "name": "Nestle Pakistan Ltd.",
        "email": "trade@nestlepk.com",
        "phone": "+92-42-35760000",
        "address": "308-Upper Mall",
        "city": "Lahore",
        "country": "Pakistan",
        "payment_terms": "Net 45",
    },
    {
        "name": "Hamdard Laboratories",
        "email": "orders@hamdard.pk",
        "phone": "+92-21-32630011",
        "address": "Nazimabad No.3",
        "city": "Karachi",
        "country": "Pakistan",
        "payment_terms": "Net 30",
    },
]

# ─────────────────────────────────────────────
# 2. Products  (200 total)
# Format: (name, description, price, cost, base_daily_demand, peak_months, vendor_idx)
# vendor_idx: 0=Lahore Bev, 1=Karachi Drinks, 2=Nestle, 3=Hamdard
# ─────────────────────────────────────────────
PRODUCTS_DATA = [
    # ── CARBONATED SOFT DRINKS (50 SKUs) ──────────────────────────────────
    ("Pepsi 1.5L PET",        "Carbonated cola, 1.5L PET bottle",              Decimal("120"),  Decimal("75"),   18, [5,6,7,8],   0),
    ("Pepsi 500ml PET",       "Carbonated cola, 500ml PET bottle",             Decimal("60"),   Decimal("36"),   22, [5,6,7,8],   0),
    ("Pepsi 330ml Can",       "Carbonated cola, 330ml aluminium can",          Decimal("65"),   Decimal("40"),   20, [5,6,7,8],   0),
    ("Pepsi 250ml Glass",     "Carbonated cola, 250ml returnable glass",       Decimal("40"),   Decimal("22"),   15, [5,6,7,8],   0),
    ("Pepsi 2.25L PET",       "Carbonated cola, 2.25L family PET bottle",     Decimal("175"),  Decimal("110"),  10, [5,6,7,8],   0),
    ("Pepsi Diet 330ml Can",  "Diet cola zero sugar, 330ml can",               Decimal("70"),   Decimal("45"),    6, [5,6,7,8],   0),
    ("Coca-Cola 1.5L PET",    "Classic cola, 1.5L PET bottle",                Decimal("120"),  Decimal("76"),   17, [5,6,7,8],   1),
    ("Coca-Cola 500ml PET",   "Classic cola, 500ml PET bottle",               Decimal("60"),   Decimal("37"),   25, [5,6,7,8],   1),
    ("Coca-Cola 330ml Can",   "Classic cola, 330ml aluminium can",            Decimal("65"),   Decimal("41"),   28, [5,6,7,8],   1),
    ("Coca-Cola 250ml Glass", "Classic cola, 250ml returnable glass",         Decimal("40"),   Decimal("23"),   18, [5,6,7,8],   1),
    ("Coca-Cola 2L PET",      "Classic cola, 2L family PET bottle",           Decimal("160"),  Decimal("100"),  12, [5,6,7,8],   1),
    ("Coke Zero 330ml Can",   "Zero-sugar cola, 330ml can",                   Decimal("70"),   Decimal("45"),    7, [5,6,7,8],   1),
    ("7UP 1.5L PET",          "Lemon-lime soda, 1.5L PET bottle",             Decimal("110"),  Decimal("68"),   14, [5,6,7,8],   0),
    ("7UP 500ml PET",         "Lemon-lime soda, 500ml PET bottle",            Decimal("55"),   Decimal("34"),   17, [5,6,7,8],   0),
    ("7UP 330ml Can",         "Lemon-lime soda, 330ml can",                   Decimal("60"),   Decimal("38"),   15, [5,6,7,8],   0),
    ("7UP 250ml Glass",       "Lemon-lime soda, 250ml glass",                 Decimal("35"),   Decimal("20"),   10, [5,6,7,8],   0),
    ("Sprite 1.5L PET",       "Crisp lemon-lime soda, 1.5L PET bottle",      Decimal("110"),  Decimal("68"),   13, [5,6,7,8],   1),
    ("Sprite 500ml PET",      "Crisp lemon-lime soda, 500ml PET",             Decimal("55"),   Decimal("34"),   16, [5,6,7,8],   1),
    ("Sprite 330ml Can",      "Crisp lemon-lime soda, 330ml can",             Decimal("60"),   Decimal("38"),   14, [5,6,7,8],   1),
    ("Fanta Orange 1.5L PET", "Orange soda, 1.5L PET bottle",                Decimal("110"),  Decimal("68"),   11, [5,6,7],     1),
    ("Fanta Orange 500ml PET","Orange soda, 500ml PET bottle",               Decimal("55"),   Decimal("34"),   13, [5,6,7],     1),
    ("Fanta Orange 330ml Can","Orange soda, 330ml can",                      Decimal("60"),   Decimal("38"),   12, [5,6,7],     1),
    ("Fanta Grape 330ml Can", "Grape soda, 330ml can",                        Decimal("60"),   Decimal("38"),    8, [5,6,7],     1),
    ("Fanta Pineapple 330ml", "Pineapple soda, 330ml can",                    Decimal("60"),   Decimal("38"),    7, [5,6,7],     1),
    ("Mountain Dew 1.5L PET", "Citrus soda, 1.5L PET bottle",                Decimal("115"),  Decimal("72"),   16, [5,6,7,8],   0),
    ("Mountain Dew 500ml PET","Citrus soda, 500ml PET bottle",               Decimal("58"),   Decimal("36"),   19, [5,6,7,8],   0),
    ("Mountain Dew 330ml Can","Citrus soda, 330ml can",                      Decimal("63"),   Decimal("40"),   17, [5,6,7,8],   0),
    ("Mirinda Orange 1.5L",   "Orange soda, 1.5L PET bottle",                Decimal("105"),  Decimal("64"),   10, [5,6,7],     0),
    ("Mirinda Orange 500ml",  "Orange soda, 500ml PET bottle",               Decimal("52"),   Decimal("32"),   12, [5,6,7],     0),
    ("Mirinda Orange 330ml",  "Orange soda, 330ml can",                      Decimal("58"),   Decimal("36"),   11, [5,6,7],     0),
    ("Mirinda Lemon 330ml",   "Lemon soda, 330ml can",                        Decimal("58"),   Decimal("36"),    9, [5,6,7],     0),
    ("RC Cola 1.5L PET",      "Royal Crown cola, 1.5L PET",                   Decimal("100"),  Decimal("60"),    8, [5,6,7,8],   1),
    ("RC Cola 500ml PET",     "Royal Crown cola, 500ml PET",                  Decimal("48"),   Decimal("28"),    9, [5,6,7,8],   1),
    ("Shani 1.5L PET",        "Desi orange flavoured soda, 1.5L PET",         Decimal("95"),   Decimal("55"),   12, [5,6,7,8],   0),
    ("Shani 500ml PET",       "Desi orange flavoured soda, 500ml PET",        Decimal("48"),   Decimal("28"),   14, [5,6,7,8],   0),
    ("Club Soda 500ml",       "Carbonated club soda, 500ml PET",              Decimal("45"),   Decimal("25"),    6, [1,2,3,4],   1),
    ("Tonic Water 330ml Can", "Carbonated tonic water, 330ml can",            Decimal("70"),   Decimal("44"),    5, [1,2,3,4],   1),
    ("Ginger Ale 330ml Can",  "Carbonated ginger ale, 330ml can",             Decimal("70"),   Decimal("44"),    5, [10,11,12],  1),
    ("Bubble Up Lemon 500ml", "Lemon-lime soda, 500ml PET",                   Decimal("50"),   Decimal("30"),    7, [5,6,7],     1),
    ("Float Orange 500ml",    "Orange cream soda, 500ml PET",                 Decimal("50"),   Decimal("30"),    6, [5,6,7],     1),
    ("Float Grape 500ml",     "Grape cream soda, 500ml PET",                  Decimal("50"),   Decimal("30"),    6, [5,6,7],     1),
    ("Pakola Ice Cream Soda", "Iconic green cream soda, 300ml glass",         Decimal("60"),   Decimal("35"),   14, [5,6,7,8],   1),
    ("Pakola Lychee 500ml",   "Lychee flavoured soda, 500ml PET",             Decimal("55"),   Decimal("33"),   10, [5,6,7],     1),
    ("Pakola Raspberry 500ml","Raspberry flavoured soda, 500ml PET",         Decimal("55"),   Decimal("33"),    9, [5,6,7],     1),
    ("Vimto 330ml Can",       "Mixed fruit & herbs soda, 330ml can",          Decimal("75"),   Decimal("48"),   11, [3,4,5,6],   1),
    ("Vimto 500ml PET",       "Mixed fruit & herbs soda, 500ml PET",          Decimal("90"),   Decimal("56"),    9, [3,4,5,6],   1),
    ("Vimto 2L PET",          "Mixed fruit & herbs soda, 2L PET",             Decimal("180"),  Decimal("112"),   6, [3,4,5,6],   1),
    ("Kickapoo Joy Juice 500ml","Citrus soda, 500ml PET",                    Decimal("50"),   Decimal("30"),    7, [5,6,7],     0),
    ("Big Apple 500ml",       "Apple flavoured soda, 500ml PET",              Decimal("48"),   Decimal("28"),    7, [5,6,7],     0),
    ("Jazz Mango 500ml",      "Mango flavoured soda, 500ml PET",              Decimal("52"),   Decimal("32"),   10, [4,5,6],     0),

    # ── BOTTLED WATER (30 SKUs) ────────────────────────────────────────────
    ("Nestle Pure Life 500ml","Purified water, 500ml PET bottle",            Decimal("35"),   Decimal("17"),   45, [4,5,6,7,8,9], 2),
    ("Nestle Pure Life 1L",   "Purified water, 1L PET bottle",               Decimal("50"),   Decimal("26"),   38, [4,5,6,7,8,9], 2),
    ("Nestle Pure Life 1.5L", "Purified water, 1.5L PET bottle",             Decimal("65"),   Decimal("35"),   30, [4,5,6,7,8,9], 2),
    ("Nestle Pure Life 5L",   "Purified water, 5L PET bottle",               Decimal("120"),  Decimal("65"),   20, [4,5,6,7,8,9], 2),
    ("Nestle Pure Life 19L",  "Office dispenser water, 19L jug",             Decimal("380"),  Decimal("200"),  10, [1,2,3,4,5,6,7,8,9,10,11,12], 2),
    ("Aquafina 500ml",        "Purified water, 500ml PET bottle",            Decimal("35"),   Decimal("18"),   42, [4,5,6,7,8,9], 0),
    ("Aquafina 1L",           "Purified water, 1L PET bottle",               Decimal("50"),   Decimal("27"),   32, [4,5,6,7,8,9], 0),
    ("Aquafina 1.5L",         "Purified water, 1.5L PET bottle",             Decimal("65"),   Decimal("36"),   25, [4,5,6,7,8,9], 0),
    ("Aquafina 5L",           "Purified water, 5L PET bottle",               Decimal("115"),  Decimal("63"),   18, [4,5,6,7,8,9], 0),
    ("Kinley Water 500ml",    "Carbonated mineral water, 500ml PET",          Decimal("40"),   Decimal("22"),   15, [4,5,6,7,8],   1),
    ("Kinley Water 1L",       "Carbonated mineral water, 1L PET",             Decimal("55"),   Decimal("30"),   12, [4,5,6,7,8],   1),
    ("Evian 500ml",           "Natural spring water imported, 500ml PET",     Decimal("250"),  Decimal("170"),   4, [6,7,8],       2),
    ("Volvic 500ml",          "Volcanic spring water, 500ml PET",             Decimal("230"),  Decimal("155"),   3, [6,7,8],       2),
    ("Dasani 500ml",          "Purified water, 500ml PET",                    Decimal("38"),   Decimal("20"),   20, [4,5,6,7,8],   1),
    ("Dasani 1.5L",           "Purified water, 1.5L PET",                     Decimal("68"),   Decimal("38"),   15, [4,5,6,7,8],   1),
    ("Sparkle Sparkling 500ml","Natural sparkling water, 500ml glass",       Decimal("120"),  Decimal("75"),    6, [5,6,7,8],     1),
    ("Perrier 330ml Can",     "Sparkling natural mineral water, 330ml",       Decimal("200"),  Decimal("135"),   3, [6,7,8],       2),
    ("San Pellegrino 500ml",  "Sparkling mineral water, 500ml glass",         Decimal("220"),  Decimal("148"),   3, [6,7,8],       2),
    ("Mineral Water 500ml LB","Local branded mineral water, 500ml",           Decimal("28"),   Decimal("14"),   50, [4,5,6,7,8,9], 1),
    ("Mineral Water 1L LB",   "Local branded mineral water, 1L",              Decimal("42"),   Decimal("22"),   35, [4,5,6,7,8,9], 1),
    ("Mineral Water 5L LB",   "Local branded mineral water, 5L",              Decimal("100"),  Decimal("55"),   20, [4,5,6,7,8,9], 1),
    ("Sparkletts 500ml",      "Purified drinking water, 500ml PET",           Decimal("30"),   Decimal("15"),   25, [4,5,6,7,8],   0),
    ("Sparkletts 1.5L",       "Purified drinking water, 1.5L PET",            Decimal("58"),   Decimal("32"),   18, [4,5,6,7,8],   0),
    ("Chill Water 500ml",     "Chilled purified water, 500ml PET",            Decimal("32"),   Decimal("16"),   28, [5,6,7,8],     0),
    ("Chill Water 1L",        "Chilled purified water, 1L PET",               Decimal("48"),   Decimal("26"),   22, [5,6,7,8],     0),
    ("Alpha Water 500ml",     "Premium purified water, 500ml PET",            Decimal("38"),   Decimal("20"),   18, [4,5,6,7,8],   0),
    ("Alpha Water 1.5L",      "Premium purified water, 1.5L PET",             Decimal("70"),   Decimal("40"),   14, [4,5,6,7,8],   0),
    ("Shifa Water 500ml",     "Shifa Health purified water, 500ml",           Decimal("30"),   Decimal("15"),   20, [4,5,6,7,8],   1),
    ("Pak Water 19L Refill",  "Dispenser water refill, 19L",                  Decimal("320"),  Decimal("170"),  12, [1,2,3,4,5,6,7,8,9,10,11,12], 1),
    ("Sufi Water 500ml",      "Sufi brand purified water, 500ml PET",         Decimal("28"),   Decimal("14"),   22, [4,5,6,7,8,9], 0),

    # ── JUICES & NECTARS (40 SKUs) ─────────────────────────────────────────
    ("Shezan Mango 250ml",    "Mango nectar tetra pack, 250ml",               Decimal("55"),   Decimal("32"),   22, [3,4,5,6],    0),
    ("Shezan Mango 1L",       "Mango nectar tetra pack, 1L",                  Decimal("160"),  Decimal("98"),   14, [3,4,5,6],    0),
    ("Shezan Apple 250ml",    "Apple juice tetra pack, 250ml",                Decimal("55"),   Decimal("32"),   15, [9,10,11],    0),
    ("Shezan Apple 1L",       "Apple juice tetra pack, 1L",                   Decimal("155"),  Decimal("95"),    9, [9,10,11],    0),
    ("Shezan Orange 250ml",   "Orange juice tetra pack, 250ml",               Decimal("55"),   Decimal("32"),   14, [3,4,5],      0),
    ("Shezan Orange 1L",      "Orange juice tetra pack, 1L",                  Decimal("158"),  Decimal("96"),    8, [3,4,5],      0),
    ("Shezan Guava 250ml",    "Guava nectar tetra pack, 250ml",               Decimal("55"),   Decimal("32"),   12, [4,5,6],      0),
    ("Shezan Guava 1L",       "Guava nectar tetra pack, 1L",                  Decimal("155"),  Decimal("95"),    7, [4,5,6],      0),
    ("Shezan Cocktail 250ml", "Mixed fruit cocktail tetra pack, 250ml",       Decimal("58"),   Decimal("34"),   13, [3,4,5,6],    0),
    ("Shezan Mixed Fruit 1L", "Mixed fruit tetra pack, 1L",                   Decimal("162"),  Decimal("99"),    8, [3,4,5,6],    0),
    ("Nestle Fruita Vital Mango 200ml","Mango nectar, 200ml tetra",          Decimal("50"),   Decimal("30"),   18, [3,4,5,6],    2),
    ("Nestle Fruita Vital Apple 200ml","Apple juice, 200ml tetra",           Decimal("50"),   Decimal("30"),   14, [9,10,11],    2),
    ("Nestle Fruita Vital Orange 200ml","Orange juice, 200ml tetra",         Decimal("50"),   Decimal("30"),   13, [3,4,5],      2),
    ("Nestle Fruita Vital 1L Mango",   "Mango nectar, 1L tetra",             Decimal("165"),  Decimal("100"),  10, [3,4,5,6],    2),
    ("Fresher Mango 500ml",   "Mango drink, 500ml PET bottle",               Decimal("60"),   Decimal("36"),   16, [4,5,6],      1),
    ("Fresher Apple 500ml",   "Apple drink, 500ml PET bottle",               Decimal("60"),   Decimal("36"),   12, [9,10,11],    1),
    ("Fresher Orange 500ml",  "Orange drink, 500ml PET bottle",              Decimal("60"),   Decimal("36"),   11, [3,4,5],      1),
    ("Fresher Guava 500ml",   "Guava drink, 500ml PET bottle",               Decimal("60"),   Decimal("36"),   10, [4,5,6],      1),
    ("Minute Maid Pulpy Orange 300ml","Pulpy orange juice, 300ml PET",      Decimal("80"),   Decimal("50"),   12, [3,4,5],      1),
    ("Minute Maid Mango 300ml","Mango drink, 300ml PET",                    Decimal("78"),   Decimal("48"),   14, [4,5,6],      1),
    ("Slice Mango 600ml",     "Mango drink, 600ml PET bottle",               Decimal("70"),   Decimal("42"),   13, [4,5,6],      0),
    ("Pulpy Mango 500ml",     "Mango pulp drink, 500ml PET",                 Decimal("65"),   Decimal("39"),   15, [4,5,6],      0),
    ("Tropicana Orange 200ml","Orange juice, 200ml tetra pack",              Decimal("75"),   Decimal("48"),   10, [3,4,5],      1),
    ("Tropicana Mango 200ml", "Mango juice, 200ml tetra pack",               Decimal("75"),   Decimal("48"),   12, [4,5,6],      1),
    ("Real Fruit Power Orange","Orange juice, 1L tetra pack",               Decimal("200"),  Decimal("130"),   7, [3,4,5],      1),
    ("Real Fruit Power Mango","Mango juice, 1L tetra pack",                 Decimal("200"),  Decimal("130"),   8, [4,5,6],      1),
    ("Juhayna Mango 235ml",   "Mango nectar, 235ml tetra",                   Decimal("55"),   Decimal("33"),    9, [4,5,6],      1),
    ("Juhayna Guava 235ml",   "Guava nectar, 235ml tetra",                   Decimal("55"),   Decimal("33"),    8, [4,5,6],      1),
    ("LMN Lemon Water 500ml", "Lemon flavoured water, 500ml PET",            Decimal("55"),   Decimal("33"),   11, [5,6,7,8],    0),
    ("Squash Orange 800ml",   "Orange squash concentrate, 800ml glass",      Decimal("280"),  Decimal("175"),   6, [3,4,5,6],    3),
    ("Squash Lemon 800ml",    "Lemon squash concentrate, 800ml glass",       Decimal("275"),  Decimal("172"),   5, [4,5,6,7],    3),
    ("Squash Rose 800ml",     "Rose squash concentrate, 800ml glass",        Decimal("280"),  Decimal("175"),   7, [3,4,5,6],    3),
    ("Rockit Mango 500ml",    "Mango drink, 500ml PET",                      Decimal("55"),   Decimal("32"),   13, [4,5,6],      0),
    ("Rockit Apple 500ml",    "Apple drink, 500ml PET",                      Decimal("55"),   Decimal("32"),   10, [9,10,11],    0),
    ("Omore Mango Drink 250ml","Mango dairy drink, 250ml tetra",             Decimal("60"),   Decimal("38"),   11, [4,5,6],      2),
    ("Al Baik Mango Juice 1L","Mango juice concentrate, 1L tetra",          Decimal("145"),  Decimal("88"),    8, [4,5,6],      1),
    ("Tapal Mango Twist 1L",  "Mango-flavoured drink, 1L tetra",             Decimal("150"),  Decimal("92"),    7, [4,5,6],      1),
    ("Pran Mango 250ml",      "Bangladeshi mango drink, 250ml tetra",        Decimal("52"),   Decimal("31"),    9, [4,5,6],      1),
    ("Pran Guava 250ml",      "Bangladeshi guava drink, 250ml tetra",        Decimal("52"),   Decimal("31"),    7, [4,5,6],      1),
    ("Dole Pineapple Juice 330ml","Pineapple juice, 330ml can",             Decimal("120"),  Decimal("78"),    6, [5,6,7],      2),

    # ── ENERGY & SPORTS DRINKS (20 SKUs) ──────────────────────────────────
    ("Red Bull 250ml Can",    "Energy drink, 250ml slim can",                Decimal("200"),  Decimal("130"),   7, [6,7,8,9],   1),
    ("Red Bull 355ml Can",    "Energy drink, 355ml can",                     Decimal("260"),  Decimal("175"),   5, [6,7,8,9],   1),
    ("Red Bull Sugar Free 250ml","Sugar-free energy drink, 250ml",          Decimal("210"),  Decimal("138"),   4, [6,7,8,9],   1),
    ("Sting Energy Red Berry 250ml","Energy drink red berry, 250ml can",    Decimal("80"),   Decimal("50"),   14, [6,7,8],     0),
    ("Sting Energy Gold 250ml","Energy drink gold rush, 250ml can",         Decimal("80"),   Decimal("50"),   11, [6,7,8],     0),
    ("Sting Energy Green Apple 250ml","Energy drink green apple, 250ml",    Decimal("80"),   Decimal("50"),    9, [6,7,8],     0),
    ("Monster Energy 500ml",  "Monster energy drink, 500ml can",            Decimal("220"),  Decimal("148"),   6, [6,7,8,9],   1),
    ("Monster Ultra White 500ml","Zero-sugar energy, 500ml can",            Decimal("230"),  Decimal("155"),   4, [6,7,8,9],   1),
    ("Burn Energy 250ml",     "Burn energy drink, 250ml can",                Decimal("120"),  Decimal("78"),    5, [6,7,8],     1),
    ("Power Horse 250ml",     "Energy drink, 250ml can",                     Decimal("100"),  Decimal("65"),    6, [6,7,8],     1),
    ("Tiger Energy 250ml",    "Tiger energy drink, 250ml can",               Decimal("75"),   Decimal("47"),    8, [6,7,8],     0),
    ("Gatorade Lemon Lime 500ml","Sports isotonic drink, 500ml PET",        Decimal("130"),  Decimal("82"),    8, [5,6,7,8,9], 1),
    ("Gatorade Orange 500ml", "Sports isotonic drink orange, 500ml PET",    Decimal("130"),  Decimal("82"),    7, [5,6,7,8,9], 1),
    ("Gatorade Fruit Punch 500ml","Sports drink fruit punch, 500ml PET",    Decimal("130"),  Decimal("82"),    6, [5,6,7,8,9], 1),
    ("Lucozade Original 380ml","Glucose energy drink, 380ml glass",         Decimal("160"),  Decimal("105"),   6, [5,6,7,8],   1),
    ("Lucozade Orange 380ml", "Orange energy drink, 380ml glass",           Decimal("160"),  Decimal("105"),   5, [5,6,7,8],   1),
    ("Shark Energy 250ml",    "Shark energy drink, 250ml can",               Decimal("90"),   Decimal("57"),    7, [6,7,8],     1),
    ("XL Energy 250ml",       "XL energy drink, 250ml can",                  Decimal("85"),   Decimal("53"),    6, [6,7,8],     0),
    ("Nescafe RTD Coffee 250ml","Ready to drink coffee, 250ml can",         Decimal("120"),  Decimal("78"),    8, [10,11,12,1,2], 2),
    ("Nescafe RTD Mocha 250ml","Ready to drink mocha, 250ml can",           Decimal("120"),  Decimal("78"),    7, [10,11,12,1,2], 2),

    # ── TRADITIONAL / MILK-BASED / SHERBETS (40 SKUs) ─────────────────────
    ("Rooh Afza 800ml",       "Hamdard rose sherbet concentrate, 800ml",     Decimal("380"),  Decimal("240"),   9, [3,4,5,6],   3),
    ("Rooh Afza 400ml",       "Hamdard rose sherbet concentrate, 400ml",     Decimal("210"),  Decimal("130"),  12, [3,4,5,6],   3),
    ("Rooh Afza 175ml",       "Hamdard rose sherbet concentrate, 175ml",     Decimal("100"),  Decimal("60"),   14, [3,4,5,6],   3),
    ("Rooh Afza Rose Water 200ml","Rose water, 200ml glass",                 Decimal("90"),   Decimal("55"),    8, [3,4,5,6],   3),
    ("Jam-e-Shirin 800ml",    "Traditional mixed sherbet, 800ml",            Decimal("300"),  Decimal("188"),   7, [3,4,5,6],   3),
    ("Jam-e-Shirin 400ml",    "Traditional mixed sherbet, 400ml",            Decimal("165"),  Decimal("100"),   9, [3,4,5,6],   3),
    ("Jam-e-Shirin 175ml",    "Traditional mixed sherbet, 175ml",            Decimal("80"),   Decimal("48"),   10, [3,4,5,6],   3),
    ("Hamdard Safi 200ml",    "Blood purifying herbal tonic, 200ml",         Decimal("120"),  Decimal("75"),    6, [1,2,3],      3),
    ("Hamdard Safi 500ml",    "Blood purifying herbal tonic, 500ml",         Decimal("260"),  Decimal("165"),   4, [1,2,3],      3),
    ("Hamdard Arq Gulab 200ml","Pure rose water distillate, 200ml",         Decimal("85"),   Decimal("52"),    5, [3,4,5,6],   3),
    ("Tapal Danedar Tea 1kg", "Premium black tea leaves, 1kg pack",          Decimal("850"),  Decimal("540"),  10, [10,11,12,1,2,3], 1),
    ("Lipton Yellow Label 200g","Yellow label tea bags, 200g box",           Decimal("480"),  Decimal("305"),   8, [10,11,12,1,2,3], 2),
    ("Tetley 100 Tea Bags",   "British blend tea bags, 100 count",           Decimal("420"),  Decimal("265"),   6, [10,11,12,1,2,3], 1),
    ("Nescafe Classic 50g",   "Instant coffee granules, 50g jar",            Decimal("380"),  Decimal("240"),   9, [10,11,12,1,2,3], 2),
    ("Nescafe Gold 100g",     "Premium instant coffee, 100g jar",            Decimal("1200"), Decimal("780"),   4, [10,11,12,1,2,3], 2),
    ("Milo 400g Tin",         "Chocolate malt drink powder, 400g tin",       Decimal("650"),  Decimal("415"),   7, [1,2,3,10,11,12], 2),
    ("Milo 200g Packet",      "Chocolate malt drink powder, 200g",           Decimal("360"),  Decimal("228"),   9, [1,2,3,10,11,12], 2),
    ("Nestle Milo RTD 200ml", "Ready-to-drink milo, 200ml tetra",            Decimal("65"),   Decimal("40"),   12, [1,2,3,10,11,12], 2),
    ("Ovaltine 400g",         "Malted chocolate drink, 400g",                Decimal("600"),  Decimal("380"),   5, [10,11,12,1,2,3], 1),
    ("Horlicks 500g",         "Malted health drink, 500g",                   Decimal("750"),  Decimal("478"),   4, [10,11,12,1,2,3], 1),
    ("Boost Drink 500g",      "Energy & sports drink powder, 500g",          Decimal("680"),  Decimal("432"),   4, [5,6,7,8],    1),
    ("Everyday Whitener 800g","Non-dairy creamer for tea/coffee, 800g",      Decimal("580"),  Decimal("368"),  10, [1,2,3,10,11,12], 2),
    ("Nestle Milkpak 1L UHT", "UHT full-cream milk, 1L tetra",               Decimal("145"),  Decimal("90"),   28, [1,2,3,4,5,6,7,8,9,10,11,12], 2),
    ("Nestle Milkpak 250ml",  "UHT full-cream milk, 250ml tetra",            Decimal("42"),   Decimal("26"),   22, [1,2,3,4,5,6,7,8,9,10,11,12], 2),
    ("Olpers Full Cream 1L",  "UHT full-cream milk, 1L tetra",               Decimal("140"),  Decimal("87"),   26, [1,2,3,4,5,6,7,8,9,10,11,12], 1),
    ("Olpers Lite Milk 1L",   "UHT low-fat milk, 1L tetra",                  Decimal("138"),  Decimal("86"),   14, [1,2,3,4,5,6,7,8,9,10,11,12], 1),
    ("Nestle Yogurt 400g",    "Natural yogurt, 400g cup",                    Decimal("155"),  Decimal("98"),   16, [1,2,3,4,5,6,7,8,9,10,11,12], 2),
    ("Lassi Mango 250ml",     "Mango lassi yogurt drink, 250ml PET",          Decimal("70"),   Decimal("44"),   15, [4,5,6,7],    2),
    ("Lassi Plain 250ml",     "Plain salted lassi, 250ml PET",               Decimal("65"),   Decimal("40"),   18, [4,5,6,7],    2),
    ("Doodh Soda 300ml",      "Traditional milk soda drink, 300ml glass",    Decimal("55"),   Decimal("33"),    8, [5,6,7,8],    1),
    ("Tapal Family Mix Tea 180g","Family blend tea bags, 180g",              Decimal("320"),  Decimal("200"),  12, [10,11,12,1,2,3], 1),
    ("Supreme Tea 200g",      "Gold blend tea leaves, 200g",                 Decimal("280"),  Decimal("175"),  10, [10,11,12,1,2,3], 1),
    ("Ahmad Tea English Breakfast 100g","English breakfast teabags, 100g",  Decimal("550"),  Decimal("350"),   5, [10,11,12,1,2,3], 1),
    ("Vital Skimmed Milk 1L", "UHT skimmed milk, 1L tetra",                  Decimal("135"),  Decimal("84"),   12, [1,2,3,4,5,6,7,8,9,10,11,12], 1),
    ("Gourmet Lassi 500ml",   "Premium lassi drink, 500ml bottle",           Decimal("120"),  Decimal("76"),   10, [4,5,6,7],    0),
    ("Desi Lassi 1L",         "Homestyle desi lassi, 1L",                    Decimal("180"),  Decimal("115"),   8, [4,5,6,7],    0),
    ("Sufi Chai Doodh 1L",    "Tea-infused milk, 1L tetra",                  Decimal("148"),  Decimal("93"),   10, [10,11,12,1,2,3], 0),
    ("Pink Salt Lassi 250ml", "Himalayan pink salt lassi, 250ml",            Decimal("75"),   Decimal("47"),    9, [4,5,6,7],    0),
    ("Flavoured Milk Vanilla 200ml","Vanilla flavoured milk, 200ml tetra",  Decimal("65"),   Decimal("41"),   11, [1,2,3,10,11,12], 2),
    ("Flavoured Milk Choc 200ml","Chocolate flavoured milk, 200ml tetra",   Decimal("65"),   Decimal("41"),   13, [1,2,3,10,11,12], 2),

    # ── HERBAL & SPECIALTY DRINKS (20 SKUs) ────────────────────────────────
    ("Hamdard Joshanda 5g Sachet","Herbal cold remedy, 5g sachet",          Decimal("25"),   Decimal("14"),   18, [11,12,1,2,3], 3),
    ("Hamdard Joshanda 100g", "Herbal cold remedy loose, 100g",              Decimal("120"),  Decimal("75"),   10, [11,12,1,2,3], 3),
    ("Hamdard Arq Ajwain 200ml","Ajwain distillate for digestion, 200ml",   Decimal("80"),   Decimal("50"),    6, [1,2,3,4,5,6,7,8,9,10,11,12], 3),
    ("Hamdard Sharbat Bazoori 200ml","Cooling sherbet, 200ml glass",        Decimal("95"),   Decimal("60"),    8, [4,5,6,7],    3),
    ("Hamdard Sharbat Banafsha 200ml","Viola flower sherbet, 200ml",        Decimal("90"),   Decimal("57"),    6, [3,4,5,6],    3),
    ("Hamdard Sharbat Zoofa 200ml","Hyssop herbal sherbet, 200ml",          Decimal("90"),   Decimal("57"),    5, [3,4,5,6],    3),
    ("Ajwa Dates Drink 250ml","Dates-based health drink, 250ml tetra",      Decimal("120"),  Decimal("76"),   10, [3,4,5,6],    3),
    ("Zamzam Water 500ml",    "Zamzam mineral water, 500ml PET (imported)", Decimal("350"),  Decimal("230"),   6, [3,4,5,6,7,8], 3),
    ("Zamzam Water 1L",       "Zamzam mineral water, 1L PET (imported)",    Decimal("650"),  Decimal("425"),   4, [3,4,5,6,7,8], 3),
    ("Pomegranate Juice 250ml","Cold-pressed pomegranate juice, 250ml",     Decimal("180"),  Decimal("115"),   7, [9,10,11],    1),
    ("Aloe Vera Drink 500ml", "Aloe vera juice drink, 500ml PET",           Decimal("150"),  Decimal("95"),    6, [4,5,6,7,8],  1),
    ("Coconut Water 330ml Can","Pure coconut water, 330ml can",             Decimal("160"),  Decimal("103"),   8, [5,6,7,8],    1),
    ("Coconut Water 500ml",   "Pure coconut water, 500ml tetra",            Decimal("220"),  Decimal("143"),   6, [5,6,7,8],    1),
    ("Ginger Honey Lemon 250ml","Herbal ginger drink, 250ml glass",         Decimal("95"),   Decimal("60"),    7, [11,12,1,2],   1),
    ("Turmeric Latte Mix 200g","Golden milk turmeric mix, 200g",            Decimal("380"),  Decimal("240"),   4, [11,12,1,2,3], 2),
    ("Green Tea Jasmine 20 bags","Jasmine green tea, 20 teabag box",        Decimal("250"),  Decimal("158"),   6, [1,2,3,10,11,12], 2),
    ("Green Tea Lemon 20 bags","Lemon green tea, 20 teabag box",            Decimal("240"),  Decimal("152"),   6, [1,2,3,10,11,12], 2),
    ("Chamomile Tea 20 bags",  "Calming chamomile tea, 20 bags",            Decimal("280"),  Decimal("177"),   4, [11,12,1,2,3], 2),
    ("Peppermint Tea 20 bags", "Refreshing peppermint tea, 20 bags",        Decimal("260"),  Decimal("165"),   5, [11,12,1,2,3], 2),
    ("Hibiscus Drink 500ml",  "Hibiscus cold drink, 500ml PET",             Decimal("110"),  Decimal("69"),    7, [4,5,6,7],    1),
]

# ─────────────────────────────────────────────
# 3. Seasonal & weekend helpers
# ─────────────────────────────────────────────
def seasonal_multiplier(d: date, peak_months: list) -> float:
    if not peak_months:
        return 1.0
    peak_centre = sum(peak_months) / len(peak_months)
    dist = min(abs(d.month - peak_centre), 12 - abs(d.month - peak_centre))
    return 0.6 + 1.4 * math.exp(-0.5 * (dist / 1.5) ** 2)


def weekend_multiplier(d: date) -> float:
    """Fridays & Saturdays are busier in Pakistan."""
    return 1.35 if d.weekday() in (4, 5) else 1.0


# ─────────────────────────────────────────────
# 4. Database creation helpers
# ─────────────────────────────────────────────
def get_or_create_vendors():
    vendors = []
    for v in VENDORS_DATA:
        vendor, _ = Vendor.objects.get_or_create(
            email=v["email"],
            defaults={k: val for k, val in v.items() if k != "email"}
        )
        vendors.append(vendor)
    return vendors


def get_or_create_category():
    cat, _ = Category.objects.get_or_create(
        name="Beverages",
        defaults={"description": "Cold drinks, juices, water, energy drinks, teas, and traditional sherbets"}
    )
    return cat


def create_products(category, vendors):
    created = []
    for name, desc, price, cost, _demand, _seasons, v_idx in PRODUCTS_DATA:
        vendor = vendors[v_idx]
        product, _ = Product.objects.get_or_create(
            name=name,
            defaults={
                "description": desc,
                "category": category,
                "price": price,
                "cost_price": cost,
                "vendor": vendor,
            }
        )
        inv, _ = Inventory.objects.get_or_create(
            product=product,
            defaults={
                "stock_quantity": random.randint(40, 400),
                "reorder_level":  random.randint(15, 50),
            }
        )
        created.append(product)
    return created


def generate_sales(products):
    SaleRecord.objects.filter(is_synthetic=True).delete()   # idempotent

    records = []
    for product, (name, _d, price, _c, base_demand, seasons, _v) in zip(products, PRODUCTS_DATA):
        current = START_DATE
        while current <= TODAY:
            mult = (
                seasonal_multiplier(current, seasons)
                * weekend_multiplier(current)
                * random.uniform(0.65, 1.35)
            )
            qty = max(1, int(round(base_demand * mult)))
            records.append(SaleRecord(
                product=product,
                quantity_sold=qty,
                sale_date=current,
                unit_price=price,
                is_synthetic=True,
            ))
            current += timedelta(days=1)

    SaleRecord.objects.bulk_create(records, batch_size=1000)
    print(f"  ✓ Inserted {len(records):,} synthetic SaleRecords")


# ─────────────────────────────────────────────
# 5. Entry point
# ─────────────────────────────────────────────
def run():
    print("Seeding Luminix ERP – Beverages forecasting data (200 products) …")
    vendors  = get_or_create_vendors()
    category = get_or_create_category()
    products = create_products(category, vendors)
    generate_sales(products)
    print(f"  ✓ Vendors  : {len(vendors)}")
    print(f"  ✓ Category : {category.name}")
    print(f"  ✓ Products : {len(products)}")
    print("Done.")


if __name__ == "__main__":
    run()
