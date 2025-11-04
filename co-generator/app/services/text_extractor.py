"""
Text extraction service for syllabus files (PDF, DOCX, TXT)
"""
import os
import logging
from typing import Optional, List
from pathlib import Path
import pdfplumber
import PyPDF2
from docx import Document
import re

logger = logging.getLogger(__name__)


class TextExtractor:
    """Extract text from various file formats"""

    @staticmethod
    def extract_from_pdf(file_path: str) -> str:
        """
        Extract text from PDF file using pdfplumber (preferred) with PyPDF2 fallback

        Args:
            file_path: Path to PDF file

        Returns:
            Extracted text as string
        """
        try:
            # Try pdfplumber first (better text extraction)
            text = ""
            try:
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n\n"

                logger.info(f"✅ Extracted {len(text)} characters from PDF using pdfplumber: {file_path}")
                return text.strip()

            except Exception as pdfplumber_error:
                logger.warning(f"⚠️ pdfplumber failed, trying PyPDF2: {str(pdfplumber_error)}")

                # Fallback to PyPDF2
                text = ""
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    num_pages = len(pdf_reader.pages)

                    for page_num in range(num_pages):
                        page = pdf_reader.pages[page_num]
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"

                logger.info(f"✅ Extracted {len(text)} characters from PDF using PyPDF2: {file_path}")
                return text.strip()

        except Exception as e:
            logger.error(f"❌ Error extracting PDF text: {str(e)}")
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")

    @staticmethod
    def extract_from_docx(file_path: str) -> str:
        """
        Extract text from DOCX file

        Args:
            file_path: Path to DOCX file

        Returns:
            Extracted text as string
        """
        try:
            doc = Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])

            logger.info(f"Extracted {len(text)} characters from DOCX: {file_path}")
            return text.strip()

        except Exception as e:
            logger.error(f"Error extracting DOCX text: {str(e)}")
            raise ValueError(f"Failed to extract text from DOCX: {str(e)}")

    @staticmethod
    def extract_from_txt(file_path: str) -> str:
        """
        Extract text from TXT file

        Args:
            file_path: Path to TXT file

        Returns:
            Extracted text as string
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()

            logger.info(f"Extracted {len(text)} characters from TXT: {file_path}")
            return text.strip()

        except UnicodeDecodeError:
            # Try with different encoding
            try:
                with open(file_path, 'r', encoding='latin-1') as file:
                    text = file.read()
                logger.info(f"Extracted {len(text)} characters from TXT (latin-1): {file_path}")
                return text.strip()
            except Exception as e:
                logger.error(f"Error extracting TXT text: {str(e)}")
                raise ValueError(f"Failed to extract text from TXT: {str(e)}")

        except Exception as e:
            logger.error(f"Error extracting TXT text: {str(e)}")
            raise ValueError(f"Failed to extract text from TXT: {str(e)}")

    @classmethod
    def extract(cls, file_path: str) -> str:
        """
        Extract text from file based on extension

        Args:
            file_path: Path to the file

        Returns:
            Extracted text as string

        Raises:
            ValueError: If file format is not supported
        """
        if not os.path.exists(file_path):
            raise ValueError(f"File not found: {file_path}")

        file_ext = Path(file_path).suffix.lower()

        if file_ext == '.pdf':
            return cls.extract_from_pdf(file_path)
        elif file_ext == '.docx':
            return cls.extract_from_docx(file_path)
        elif file_ext == '.txt':
            return cls.extract_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}. Supported: .pdf, .docx, .txt")

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> list:
        """
        Split text into overlapping chunks

        Args:
            text: Input text to chunk
            chunk_size: Size of each chunk in characters
            overlap: Overlap between chunks

        Returns:
            List of text chunks
        """
        if not text:
            return []

        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk.strip())
            start = end - overlap

        logger.info(f"Split text into {len(chunks)} chunks")
        return chunks

    @staticmethod
    def clean_text(text: str) -> str:
        """
        Clean extracted text with advanced cleaning

        Args:
            text: Raw extracted text

        Returns:
            Cleaned text
        """
        if not text:
            return ""

        # Remove null bytes and special characters
        text = text.replace('\x00', '').replace('\r', '\n')

        # Remove excessive newlines (more than 2)
        text = re.sub(r'\n{3,}', '\n\n', text)

        # Remove page numbers (standalone digits or "Page X" patterns)
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            # Skip empty lines
            if not line:
                continue
            # Skip page numbers (just digits or "Page X" pattern)
            if line.isdigit() or re.match(r'^Page\s+\d+$', line, re.IGNORECASE):
                continue
            # Skip very short lines that are likely artifacts (< 3 chars)
            if len(line) < 3:
                continue
            cleaned_lines.append(line)

        # Join with single newline
        text = '\n'.join(cleaned_lines)

        # Remove excessive whitespace within lines
        text = re.sub(r'\s+', ' ', text)

        # Remove headers/footers (repeated patterns)
        # This is a simple heuristic - can be improved
        text = re.sub(r'(.*?\n)\1{2,}', r'\1', text)

        return text.strip()

    @staticmethod
    def extract_course_info(text: str) -> dict:
        """
        Extract course metadata from syllabus text

        Args:
            text: Syllabus text

        Returns:
            Dictionary with course info (code, name, credits, etc.)
        """
        info = {
            "course_code": None,
            "course_name": None,
            "credits": None,
            "semester": None,
            "instructor": None
        }

        # Extract course code (pattern: XXX123, CS101, 22CS202, etc.)
        code_match = re.search(r'\b([A-Z]{2,4}\s*\d{3,4}|[A-Z]{2,4}-\d{3,4}|\d{2}[A-Z]{2,4}\d{3})\b', text)
        if code_match:
            info["course_code"] = code_match.group(1).replace(' ', '')

        # Extract credits
        credits_match = re.search(r'(\d+)\s*credits?', text, re.IGNORECASE)
        if credits_match:
            info["credits"] = int(credits_match.group(1))

        # Extract semester
        semester_match = re.search(r'(Spring|Fall|Summer|Winter)\s*(\d{4})', text, re.IGNORECASE)
        if semester_match:
            info["semester"] = f"{semester_match.group(1)} {semester_match.group(2)}"

        return info
