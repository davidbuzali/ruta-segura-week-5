#!/usr/bin/env python3
"""Generate the three Week 5 submission PDFs with a consistent visual system."""

from __future__ import annotations

import argparse
import html
import json
import re
import textwrap
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


NAVY = colors.HexColor("#102A43")
BLUE = colors.HexColor("#245D87")
TEAL = colors.HexColor("#087F73")
PALE_BLUE = colors.HexColor("#EAF3FB")
PALE_TEAL = colors.HexColor("#E7F5F2")
PALE_GOLD = colors.HexColor("#FFF6DF")
SLATE = colors.HexColor("#52677B")
LIGHT = colors.HexColor("#DCE6EE")
PAPER = colors.HexColor("#F7FAFC")


def register_fonts() -> None:
    root = Path("/System/Library/Fonts/Supplemental")
    pdfmetrics.registerFont(TTFont("Arial", str(root / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(root / "Arial Bold.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Italic", str(root / "Arial Italic.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-BoldItalic", str(root / "Arial Bold Italic.ttf")))
    pdfmetrics.registerFontFamily(
        "Arial",
        normal="Arial",
        bold="Arial-Bold",
        italic="Arial-Italic",
        boldItalic="Arial-BoldItalic",
    )


def clean_text(value: str) -> str:
    return (
        value.replace("\u2010", "-")
        .replace("\u2011", "-")
        .replace("\u2012", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u2212", "-")
        .replace("\u00a0", " ")
    )


def inline_markup(value: str) -> str:
    escaped = html.escape(clean_text(value), quote=True)
    escaped = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda match: f'<link href="{match.group(2)}" color="#245D87">{match.group(1)}</link>',
        escaped,
    )
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"`([^`]+)`", r'<font name="Courier" size="8">\1</font>', escaped)
    return escaped


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Arial-Bold",
            fontSize=27,
            leading=31,
            textColor=NAVY,
            alignment=TA_LEFT,
            spaceAfter=14,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Arial",
            fontSize=12,
            leading=17,
            textColor=SLATE,
            spaceAfter=10,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Arial-Bold",
            fontSize=21,
            leading=25,
            textColor=NAVY,
            spaceBefore=8,
            spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Arial-Bold",
            fontSize=14.5,
            leading=18,
            textColor=TEAL,
            spaceBefore=13,
            spaceAfter=7,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=base["Heading3"],
            fontName="Arial-Bold",
            fontSize=11.5,
            leading=15,
            textColor=BLUE,
            spaceBefore=10,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Arial",
            fontSize=9.5,
            leading=14,
            textColor=NAVY,
            spaceAfter=6,
            wordWrap="CJK",
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Arial",
            fontSize=8,
            leading=11,
            textColor=SLATE,
            spaceAfter=4,
            wordWrap="CJK",
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Arial",
            fontSize=9.3,
            leading=13.5,
            textColor=NAVY,
            leftIndent=16,
            firstLineIndent=-9,
            bulletIndent=5,
            spaceAfter=4,
            wordWrap="CJK",
        ),
        "quote": ParagraphStyle(
            "Quote",
            parent=base["BodyText"],
            fontName="Arial-Italic",
            fontSize=9.2,
            leading=14,
            textColor=colors.HexColor("#334E67"),
            leftIndent=15,
            rightIndent=8,
            borderColor=TEAL,
            borderWidth=0,
            borderLeft=3,
            borderPadding=8,
            backColor=PALE_TEAL,
            spaceAfter=8,
        ),
        "code": ParagraphStyle(
            "Code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=6.7,
            leading=8.5,
            textColor=NAVY,
            leftIndent=7,
            rightIndent=7,
            borderColor=LIGHT,
            borderWidth=0.5,
            borderPadding=7,
            backColor=PAPER,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "cover_label": ParagraphStyle(
            "CoverLabel",
            parent=base["Normal"],
            fontName="Arial-Bold",
            fontSize=9,
            leading=12,
            textColor=TEAL,
            tracking=1.2,
            spaceAfter=10,
        ),
        "chat_user": ParagraphStyle(
            "ChatUser",
            parent=base["BodyText"],
            fontName="Arial",
            fontSize=8.7,
            leading=12.5,
            textColor=NAVY,
            leftIndent=9,
            rightIndent=4,
            borderColor=colors.HexColor("#9EC5E5"),
            borderWidth=0.5,
            borderPadding=7,
            backColor=PALE_BLUE,
            spaceAfter=5,
            wordWrap="CJK",
        ),
        "chat_assistant": ParagraphStyle(
            "ChatAssistant",
            parent=base["BodyText"],
            fontName="Arial",
            fontSize=8.7,
            leading=12.5,
            textColor=NAVY,
            leftIndent=9,
            rightIndent=4,
            borderColor=colors.HexColor("#9DD8CF"),
            borderWidth=0.5,
            borderPadding=7,
            backColor=PALE_TEAL,
            spaceAfter=5,
            wordWrap="CJK",
        ),
    }


def page_decorator(document_title: str):
    def draw(canvas, doc):
        canvas.saveState()
        width, height = letter
        canvas.setStrokeColor(LIGHT)
        canvas.setLineWidth(0.5)
        canvas.line(0.65 * inch, height - 0.47 * inch, width - 0.65 * inch, height - 0.47 * inch)
        canvas.setFont("Arial", 7.5)
        canvas.setFillColor(SLATE)
        canvas.drawString(0.65 * inch, height - 0.36 * inch, clean_text(document_title))
        canvas.drawRightString(width - 0.65 * inch, 0.36 * inch, f"David Buzali  |  Page {doc.page}")
        canvas.restoreState()

    return draw


def cover(story, styles, label: str, title: str, subtitle: str, details: list[str]) -> None:
    story.extend(
        [
            Spacer(1, 0.72 * inch),
            HRFlowable(width="100%", thickness=7, color=TEAL, spaceAfter=24),
            Paragraph(clean_text(label.upper()), styles["cover_label"]),
            Paragraph(inline_markup(title), styles["title"]),
            Paragraph(inline_markup(subtitle), styles["subtitle"]),
            Spacer(1, 0.22 * inch),
        ]
    )
    data = [[Paragraph("<b>Submission detail</b>", styles["small"]), Paragraph("<b>Value</b>", styles["small"])]]
    for detail in details:
        key, value = detail.split("::", 1)
        data.append([Paragraph(inline_markup(key), styles["small"]), Paragraph(inline_markup(value), styles["small"])])
    table = Table(data, colWidths=[1.45 * inch, 5.55 * inch], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), PAPER),
                ("GRID", (0, 0), (-1, -1), 0.35, LIGHT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend([table, Spacer(1, 0.25 * inch), Paragraph("Prepared for final Week 5 submission.", styles["small"]), PageBreak()])


def image_flowable(image_path: Path, max_width: float, max_height: float) -> Image:
    with PILImage.open(image_path) as source:
        width, height = source.size
    scale = min(max_width / width, max_height / height)
    result = Image(str(image_path), width=width * scale, height=height * scale)
    result.hAlign = "CENTER"
    return result


def table_widths(column_count: int, available_width: float) -> list[float]:
    ratios = {
        2: [0.28, 0.72],
        3: [0.18, 0.32, 0.50],
        4: [0.10, 0.16, 0.34, 0.40],
        5: [0.08, 0.12, 0.24, 0.36, 0.20],
    }.get(column_count, [1 / column_count] * column_count)
    return [available_width * ratio for ratio in ratios]


def markdown_story(markdown_path: Path, styles, available_width: float) -> list:
    lines = markdown_path.read_text(encoding="utf-8").splitlines()
    story: list = []
    index = 0

    while index < len(lines):
        line = clean_text(lines[index].rstrip())
        stripped = line.strip()

        if not stripped:
            story.append(Spacer(1, 3))
            index += 1
            continue

        if stripped.startswith("```"):
            language = stripped[3:].strip()
            index += 1
            code_lines: list[str] = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                cleaned = clean_text(lines[index])
                code_lines.extend(textwrap.wrap(cleaned, width=98, subsequent_indent="  ") or [""])
                index += 1
            index += 1
            label = "Mermaid source" if language == "mermaid" else (language or "Code")
            story.append(
                KeepTogether(
                    [
                        Paragraph(f"<b>{html.escape(label)}</b>", styles["small"]),
                        Preformatted("\n".join(code_lines), styles["code"]),
                    ]
                )
            )
            continue

        if stripped.startswith("|") and index + 1 < len(lines) and re.match(r"^\s*\|?\s*:?-+", lines[index + 1]):
            raw_rows: list[list[str]] = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                cells = [cell.strip() for cell in clean_text(lines[index]).strip().strip("|").split("|")]
                raw_rows.append(cells)
                index += 1
            if len(raw_rows) > 1:
                raw_rows.pop(1)
            column_count = max(len(row) for row in raw_rows)
            data = []
            for row_index, row in enumerate(raw_rows):
                padded = row + [""] * (column_count - len(row))
                data.append([Paragraph(inline_markup(cell), styles["small"]) for cell in padded])
            table = Table(data, colWidths=table_widths(column_count, available_width), repeatRows=1, splitByRow=1)
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                        ("GRID", (0, 0), (-1, -1), 0.35, LIGHT),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 5),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ]
                )
            )
            story.extend([table, Spacer(1, 6)])
            continue

        image_match = re.match(r"^!\[([^]]*)\]\(([^)]+)\)$", stripped)
        if image_match:
            alt, relative = image_match.groups()
            image_path = (markdown_path.parent / relative).resolve()
            story.append(image_flowable(image_path, available_width, 6.6 * inch))
            story.append(Paragraph(inline_markup(alt), styles["small"]))
            story.append(Spacer(1, 7))
            index += 1
            continue

        heading_match = re.match(r"^(#{1,3})\s+(.+)$", stripped)
        if heading_match:
            level = len(heading_match.group(1))
            heading = Paragraph(inline_markup(heading_match.group(2)), styles[f"h{level}"])
            heading.keepWithNext = 1
            lookahead = index + 1
            while lookahead < len(lines) and not lines[lookahead].strip():
                lookahead += 1
            next_image = re.match(r"^!\[([^]]*)\]\(([^)]+)\)$", lines[lookahead].strip()) if lookahead < len(lines) else None
            if next_image:
                alt, relative = next_image.groups()
                image_path = (markdown_path.parent / relative).resolve()
                story.append(
                    KeepTogether(
                        [
                            heading,
                            image_flowable(image_path, available_width, 6.3 * inch),
                            Paragraph(inline_markup(alt), styles["small"]),
                            Spacer(1, 7),
                        ]
                    )
                )
                index = lookahead + 1
                continue
            if lookahead < len(lines) and lines[lookahead].strip().startswith("```"):
                language = lines[lookahead].strip()[3:].strip()
                code_index = lookahead + 1
                code_lines: list[str] = []
                while code_index < len(lines) and not lines[code_index].strip().startswith("```"):
                    cleaned = clean_text(lines[code_index])
                    code_lines.extend(textwrap.wrap(cleaned, width=98, subsequent_indent="  ") or [""])
                    code_index += 1
                label = "Mermaid source" if language == "mermaid" else (language or "Code")
                story.append(
                    KeepTogether(
                        [
                            heading,
                            Paragraph(f"<b>{html.escape(label)}</b>", styles["small"]),
                            Preformatted("\n".join(code_lines), styles["code"]),
                        ]
                    )
                )
                index = code_index + 1
                continue
            story.append(heading)
            index = lookahead
            continue

        if stripped.startswith(">"):
            quote_lines = []
            while index < len(lines) and lines[index].strip().startswith(">"):
                quote_lines.append(clean_text(lines[index].strip()[1:].strip()))
                index += 1
            story.append(Paragraph(inline_markup(" ".join(quote_lines)), styles["quote"]))
            continue

        bullet_match = re.match(r"^[-*]\s+(.+)$", stripped)
        numbered_match = re.match(r"^(\d+)\.\s+(.+)$", stripped)
        if bullet_match:
            story.append(Paragraph(inline_markup(bullet_match.group(1)), styles["bullet"], bulletText="•"))
            index += 1
            continue
        if numbered_match:
            story.append(Paragraph(inline_markup(numbered_match.group(2)), styles["bullet"], bulletText=f"{numbered_match.group(1)}."))
            index += 1
            continue

        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            candidate = clean_text(lines[index].strip())
            if not candidate or re.match(r"^(#{1,3})\s+|^```|^\||^!\[|^>|^[-*]\s+|^\d+\.\s+", candidate):
                break
            paragraph_lines.append(candidate)
            index += 1
        story.append(Paragraph(inline_markup(" ".join(paragraph_lines)), styles["body"]))

    return story


def build_markdown_pdf(source: Path, output: Path, label: str, title: str, subtitle: str, details: list[str]) -> None:
    styles = make_styles()
    document = SimpleDocTemplate(
        str(output),
        pagesize=letter,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.63 * inch,
        bottomMargin=0.58 * inch,
        title=title,
        author="David Buzali",
        subject="Week 5 Ruta Segura submission",
    )
    story: list = []
    cover(story, styles, label, title, subtitle, details)
    story.extend(markdown_story(source, styles, document.width))
    decorator = page_decorator(title)
    document.build(story, onFirstPage=decorator, onLaterPages=decorator)


def extract_visible_chat(rollout: Path) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    seen: set[str] = set()
    local_zone = ZoneInfo("America/Mexico_City")

    with rollout.open(encoding="utf-8") as stream:
        for line in stream:
            item = json.loads(line)
            if item.get("type") != "response_item":
                continue
            payload = item.get("payload") or {}
            if payload.get("type") != "message" or payload.get("role") not in {"user", "assistant"}:
                continue
            message_id = payload.get("id") or f"line-{len(messages)}"
            if message_id in seen:
                continue
            seen.add(message_id)
            text = "\n".join(part.get("text", "") for part in payload.get("content", []) if part.get("type") in {"input_text", "output_text"}).strip()
            if not text or text.startswith("<recommended_plugins>") or text.startswith("<environment_context>"):
                continue
            text = re.sub(r"\b[A-Z0-9]{4}-[A-Z0-9]{4}\b", "[REDACTED DEVICE CODE]", text)
            timestamp = datetime.fromisoformat(item["timestamp"].replace("Z", "+00:00")).astimezone(local_zone)
            messages.append(
                {
                    "role": payload["role"],
                    "time": timestamp.strftime("%d %b %Y, %H:%M:%S %Z"),
                    "text": clean_text(text),
                }
            )
    return messages


def chat_blocks(text: str) -> list[str]:
    return [block.strip() for block in re.split(r"\n\s*\n", text) if block.strip()]


def build_chat_pdf(rollout: Path, output: Path) -> None:
    styles = make_styles()
    title = "BUILDCHAT - Ruta Segura Week 5"
    document = SimpleDocTemplate(
        str(output),
        pagesize=letter,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.63 * inch,
        bottomMargin=0.58 * inch,
        title=title,
        author="David Buzali",
        subject="Visible Week 5 build conversation",
    )
    messages = extract_visible_chat(rollout)
    story: list = []
    cover(
        story,
        styles,
        "Build conversation",
        title,
        "Full visible user-assistant transcript for the Ruta Segura Week 5 build.",
        [
            "Author::David Buzali",
            "Task::Week 5 Building",
            f"Visible messages::{len(messages)}",
            "Export boundary::Through the final-submission request and PDF preparation turn",
            "Privacy boundary::Internal reasoning, system instructions, credentials, and tool telemetry excluded",
        ],
    )
    story.append(Paragraph("Conversation transcript", styles["h1"]))
    story.append(
        Paragraph(
            "This export preserves the visible conversation in chronological order. File attachments are identified by the text shown in chat; binary files and internal execution logs are not reproduced.",
            styles["body"],
        )
    )

    for message in messages:
        is_user = message["role"] == "user"
        label = "DAVID BUZALI - USER" if is_user else "CODEX - ASSISTANT"
        background = PALE_BLUE if is_user else PALE_TEAL
        header = Table(
            [[Paragraph(f"<b>{label}</b>", styles["small"]), Paragraph(message["time"], styles["small"])]],
            colWidths=[document.width * 0.62, document.width * 0.38],
        )
        header.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), background),
                    ("LINEABOVE", (0, 0), (-1, 0), 1.2, BLUE if is_user else TEAL),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(header)
        message_style = styles["chat_user"] if is_user else styles["chat_assistant"]
        for block in chat_blocks(message["text"]):
            rendered = inline_markup(block).replace("\n", "<br/>")
            story.append(Paragraph(rendered, message_style))
        story.append(Spacer(1, 7))

    decorator = page_decorator(title)
    document.build(story, onFirstPage=decorator, onLaterPages=decorator)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--rollout", type=Path, required=True)
    args = parser.parse_args()

    register_fonts()
    repo = args.repo.resolve()
    output_dir = repo / "output" / "pdf"
    output_dir.mkdir(parents=True, exist_ok=True)

    shared_details = [
        "Author::David Buzali",
        "Coursework::Week 5 individual working slice",
        "Product::Ruta Segura",
        "Live URL::https://week-5-ruta-segura.vercel.app",
        "GitHub::https://github.com/davidbuzali/ruta-segura-week-5",
        "Data boundary::Synthetic records only",
    ]

    build_markdown_pdf(
        repo / "docs" / "PACKET.md",
        output_dir / "PACKET_davidbuzali.pdf",
        "Product packet",
        "Ruta Segura - Week 5 Build Packet",
        "A fail-closed readiness gate for synthetic screening-pilot planning.",
        shared_details,
    )
    build_markdown_pdf(
        repo / "docs" / "PERSONA.md",
        output_dir / "PERSONA_davidbuzali.pdf",
        "Persona test",
        "Ruta Segura - Persona Test Log",
        "Mariana's ordered walkthrough, confusion log, ranked findings, and verified fix.",
        shared_details,
    )
    build_chat_pdf(args.rollout.resolve(), output_dir / "BUILDCHAT_davidbuzali.pdf")


if __name__ == "__main__":
    main()
