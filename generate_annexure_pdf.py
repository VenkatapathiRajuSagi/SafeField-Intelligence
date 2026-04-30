import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Preformatted, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib import colors

class ProjectDocDocTemplate(SimpleDocTemplate):
    def __init__(self, filename, **kwargs):
        # 3.75 cm on binding edge (left), 2.5 cm on others
        super().__init__(filename, pagesize=A4, 
                         leftMargin=3.75*cm, rightMargin=2.5*cm, 
                         topMargin=2.5*cm, bottomMargin=2.5*cm, **kwargs)

def add_page_number(canvas, doc):
    page_num = canvas.getPageNumber()
    canvas.saveState()
    canvas.setFont('Times-Roman', 12)
    canvas.drawRightString(A4[0] - 2.5*cm, 2.0*cm, str(page_num))
    canvas.restoreState()

def build_annexure_pdf():
    pdf_filename = 'Snakebite_AI_Annexure.pdf'
    doc = ProjectDocDocTemplate(pdf_filename)
    
    styles = getSampleStyleSheet()
    
    # Define required styles
    style_chapter = ParagraphStyle('ChapterHead', fontName='Times-Bold', fontSize=16, leading=20, spaceAfter=24, alignment=TA_CENTER)
    style_subhead = ParagraphStyle('SubHead', fontName='Times-Bold', fontSize=14, leading=18, spaceAfter=12)
    style_text = ParagraphStyle('TextBody', fontName='Times-Roman', fontSize=12, leading=18, alignment=TA_JUSTIFY, spaceAfter=12)
    style_center = ParagraphStyle('TextCenter', fontName='Times-Roman', fontSize=12, leading=18, alignment=TA_CENTER, spaceAfter=12)
    
    story = []

    # Title Page for Annexure
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph("SNAKEBITE AI: MULTIMODAL SAFETY MONITORING SYSTEM", style_chapter))
    story.append(Spacer(1, 1*inch))
    story.append(Paragraph("DOCUMENTATION ANNEXURE", style_center))
    story.append(Spacer(1, 3*inch))
    story.append(PageBreak())

    # ANNEXURE CONTENT
    story.append(Paragraph("ANNEXURE", style_chapter))
    
    story.append(Paragraph("Annexure I: Hardware and Software Specifications", style_subhead))
    story.append(Paragraph("Hardware Capabilities:", style_subhead))
    story.append(Paragraph("- Processor: High-performance edge compute capable of accelerating MediaPipe and YOLO inferences.", style_text))
    story.append(Paragraph("- Camera: High-resolution real-time stream capable web or CCTV camera.", style_text))
    story.append(Paragraph("Software Capabilities:", style_subhead))
    story.append(Paragraph("- Programming Language: Python 3.10+", style_text))
    story.append(Paragraph("- Frameworks: PyTorch, Ultralytics, OpenCV, MediaPipe", style_text))
    story.append(PageBreak())
    
    story.append(Paragraph("Annexure II: Additional Telemetry and Alerts", style_subhead))
    story.append(Paragraph("Alert configuration examples and sample JSON structures used in the Twilio API bridging strategy.", style_text))
    story.append(Paragraph("Notifications are formatted as SMS text components with geo-spatial references automatically included via variables.", style_text))
    
    story.append(PageBreak())

    story.append(Paragraph("Annexure III: Code Modules Overview", style_subhead))
    story.append(Paragraph("A component breakdown for the modular AI architecture:", style_text))
    story.append(Paragraph("- vision/snake_detector.py : Handles YOLOv8 CNN model inference.", style_text))
    story.append(Paragraph("- human/fall_detector.py : Processes MediaPipe pose landmarks.", style_text))
    story.append(Paragraph("- risk/fusion_engine.py : Evaluates concurrent hazards.", style_text))

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"PDF successfully generated at {pdf_filename}")

if __name__ == '__main__':
    try:
        build_annexure_pdf()
    except Exception as e:
        print(e)
