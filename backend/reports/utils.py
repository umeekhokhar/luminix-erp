from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_profit_pdf(buffer, report):
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=1, spaceAfter=20)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], alignment=1, spaceAfter=30, textColor=colors.grey)

    # Header
    elements.append(Paragraph("LUMINIX ERP - PROFIT & LOSS REPORT", title_style))
    elements.append(Paragraph(f"Generated on: {report.created_at.strftime('%B %d, %Y')}", subtitle_style))
    elements.append(Spacer(1, 12))

    # Data Table
    data = [
        ["Category", "Details", "Amount"],
        ["Stock Value", "Inventory at Cost", f"{report.stock_value:,.2f}"],
        ["Cash Assets", "Bank & Cash Accounts", f"{report.cash_balance:,.2f}"],
        ["Receivables", "Customer Balances", f"{report.receivables:,.2f}"],
        ["Payables", "Vendor Balances", f"({report.payables:,.2f})"],
        ["Expenses", "Unprocessed Expenses", f"({report.expenses_total:,.2f})"],
        ["", "", ""],
        ["WORKING CAPITAL", "", f"{report.working_capital:,.2f}"],
        ["NET PROFIT/LOSS", "Vs Previous Report", f"{report.net_profit_loss:,.2f}"],
    ]

    t = Table(data, colWidths=[150, 200, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.whitesmoke),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        # Highlight Working Capital & Profit
        ('FONTNAME', (0, 7), (-1, 8), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 8), (-1, 8), colors.lightgreen if report.net_profit_loss >= 0 else colors.lightpink),
    ]))

    elements.append(t)
    
    # Notes Section
    if report.notes:
        elements.append(Spacer(1, 30))
        elements.append(Paragraph("Admin Notes:", styles['Heading3']))
        elements.append(Paragraph(report.notes, styles['Normal']))

    doc.build(elements)