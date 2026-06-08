# Payment Verification Bot - Admin Jago CV
# Bot otomasi untuk verifikasi bukti pembayaran dengan membaca barcode/QR code
# dan membandingkan nominal.

import os
import re
import json
import logging
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np
from PIL import Image
from dotenv import load_dotenv

# Optional imports with fallback
try:
    from pyzbar.pyzbar import decode as pyzbar_decode
    PYZBAR_AVAILABLE = True
except ImportError:
    PYZBAR_AVAILABLE = False

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    from pyzxing import BarCodeReader as ZXingReader
    ZXING_AVAILABLE = True
except ImportError:
    ZXING_AVAILABLE = False

load_dotenv()

# ─── Logging Setup ────────────────────────────────────────────────────────────
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - Payment Verification Bot - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "payment_bot.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


# ─── Result Model ─────────────────────────────────────────────────────────────
class VerificationResult:
    def __init__(
        self,
        status: str,  # "ACCEPTED" | "REJECTED" | "ESCALATED"
        order_id: str,
        detected_amount: Optional[float] = None,
        expected_amount: Optional[float] = None,
        method: str = "UNKNOWN",
        reason: str = "",
        confidence: float = 0.0,
    ):
        self.status = status
        self.order_id = order_id
        self.detected_amount = detected_amount
        self.expected_amount = expected_amount
        self.method = method
        self.reason = reason
        self.confidence = confidence
        self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "order_id": self.order_id,
            "detected_amount": self.detected_amount,
            "expected_amount": self.expected_amount,
            "method": self.method,
            "reason": self.reason,
            "confidence": self.confidence,
            "timestamp": self.timestamp,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


# ─── Payment Verification Bot ─────────────────────────────────────────────────
class PaymentVerificationBot:
    """Bot otomasi verifikasi bukti pembayaran.

    Alur Kerja:
      1. Terima Notifikasi dari CS
      2. Cek Bukti Pembayaran (barcode/QR → OCR fallback)
      3. Keputusan Otomatis (ACCEPT / REJECT / ESCALATE)
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY_PAYMENT", "")
        if not self.api_key:
            logger.warning("API Key tidak ditemukan. Set GEMINI_API_KEY_PAYMENT di .env")

    # ─── STEP 1: Terima Notifikasi ──────────────────────────────────────────
    def receive_notification(self, notification: dict) -> dict:
        """Terima notifikasi dari CS bahwa ada bukti pembayaran masuk."""
        required = ["order_id", "user_id", "order_amount", "image_path"]
        for field in required:
            if field not in notification:
                raise ValueError(f"Field '{field}' wajib ada di notifikasi")

        logger.info(f"NOTIFIKASI DITERIMA | Order: {notification['order_id']} | "
                     f"User: {notification['user_id']} | "
                     f"Amount: Rp {notification['order_amount']:,.0f}")

        return notification

    # ─── STEP 2: Cek Bukti Pembayaran ────────────────────────────────────────
    def load_image(self, image_path: str) -> Optional[np.ndarray]:
        """Load gambar bukti pembayaran."""
        if not os.path.exists(image_path):
            logger.error(f"Gambar tidak ditemukan: {image_path}")
            return None
        img = cv2.imread(image_path)
        if img is None:
            logger.error(f"Gagal membaca gambar: {image_path}")
            return None
        logger.info(f"Gambar berhasil dimuat: {image_path} ({img.shape[1]}x{img.shape[0]})")
        return img

    def preprocess_image(self, img: np.ndarray) -> np.ndarray:
        """Pre-processing gambar untuk optimalisasi barcode/OCR."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return thresh

    def read_barcode_pyzbar(self, img: np.ndarray) -> Tuple[Optional[str], float]:
        """Baca barcode/QR code menggunakan Pyzbar."""
        if not PYZBAR_AVAILABLE:
            logger.warning("Pyzbar tidak tersedia, skip")
            return None, 0.0

        try:
            pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            barcodes = pyzbar_decode(pil_img)
            if barcodes:
                data = barcodes[0].data.decode("utf-8")
                logger.info(f"Barcode terdeteksi (Pyzbar): {data[:80]}...")
                return data, 0.95
        except Exception as e:
            logger.warning(f"Pyzbar gagal: {e}")

        return None, 0.0

    def read_barcode_zxing(self, img: np.ndarray) -> Tuple[Optional[str], float]:
        """Baca barcode/QR code menggunakan PyZXing (alternative)."""
        if not ZXING_AVAILABLE:
            logger.warning("PyZXing tidak tersedia, skip")
            return None, 0.0

        try:
            temp_path = LOG_DIR / "_temp_barcode.png"
            cv2.imwrite(str(temp_path), img)
            reader = ZXingReader()
            results = reader.decode(str(temp_path))
            temp_path.unlink(missing_ok=True)
            if results and len(results) > 0:
                data = results[0].get("parsed", results[0].get("raw", ""))
                if data:
                    logger.info(f"Barcode terdeteksi (ZXing): {str(data)[:80]}...")
                    return str(data), 0.90
        except Exception as e:
            logger.warning(f"ZXing gagal: {e}")

        return None, 0.0

    def read_barcode(self, img: np.ndarray) -> Tuple[Optional[str], float, str]:
        """Read barcode with multiple engines, return (data, confidence, engine)."""
        data, conf = self.read_barcode_pyzbar(img)
        if data:
            return data, conf, "PYZBAR"

        data, conf = self.read_barcode_zxing(img)
        if data:
            return data, conf, "ZXING"

        # Try on preprocessed
        processed = self.preprocess_image(img)
        data, conf = self.read_barcode_pyzbar(processed)
        if data:
            return data, conf, "PYZBAR_PP"

        return None, 0.0, "NONE"

    def extract_text_ocr(self, img: np.ndarray) -> Tuple[Optional[str], float]:
        """Extract text using Tesseract OCR (fallback)."""
        if not TESSERACT_AVAILABLE:
            logger.warning("Tesseract tidak tersedia, skip OCR")
            return None, 0.0

        try:
            processed = self.preprocess_image(img)
            custom_config = r"--oem 3 --psm 6 -l ind+eng"
            text = pytesseract.image_to_string(processed, config=custom_config)
            text = text.strip()
            if text:
                logger.info(f"OCR berhasil: {text[:100]}...")
                return text, 0.80
        except Exception as e:
            logger.warning(f"OCR gagal: {e}")

        return None, 0.0

    def extract_amount_from_barcode(self, data: str) -> Optional[float]:
        """Extract nominal amount from barcode/QR data."""
        if not data:
            return None

        # Pattern: nominal dalam format Rupiah
        patterns = [
            r'(?:Rp|RP|rp|IDR)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)',
            r'(?:total|amount|nominal|jumlah|harga|bayar|dibayar)[:\s]*([0-9,.]+)',
            r'(?:Rp|RP|rp)\s*([0-9,.]+)',
            r'([0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)\s*(?:rupiah|rb|ribu|juta)',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, data, re.IGNORECASE)
            for match in matches:
                amount = self._parse_amount(match)
                if amount and 1000 <= amount <= 10000000:
                    logger.info(f"Nominal terdeteksi dari QR: Rp {amount:,.0f}")
                    return amount

        # Jika data QR adalah angka langsung (contoh: QRIS amount)
        amount = self._parse_amount(data.strip())
        if amount and 1000 <= amount <= 10000000:
            return amount

        return None

    def extract_amount_from_text(self, text: str) -> Optional[float]:
        """Extract nominal amount from OCR text."""
        if not text:
            return None

        lines = text.split("\n")
        amounts = []

        for line in lines:
            pattern = r'(?:Rp|RP|rp|IDR)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)'
            matches = re.findall(pattern, line, re.IGNORECASE)
            for match in matches:
                amount = self._parse_amount(match)
                if amount and amount >= 1000:
                    amounts.append(amount)

        # Ambil nominal yang paling mendekati harga pesanan umum
        if amounts:
            # Filter nominal yang masuk akal (10rb - 10jt)
            reasonable = [a for a in amounts if 10000 <= a <= 10000000]
            if reasonable:
                detected = max(set(reasonable), key=reasonable.count)
                logger.info(f"Nominal terdeteksi dari OCR: Rp {detected:,.0f}")
                return detected

        return None

    def _parse_amount(self, text: str) -> Optional[float]:
        """Parse amount string to float."""
        if not text:
            return None
        try:
            # Handle format Indonesia: 75.000,00 or 75,000.00
            text = text.strip().replace(" ", "")
            if "," in text and "." in text:
                if text.rfind(",") > text.rfind("."):
                    text = text.replace(".", "").replace(",", ".")
                else:
                    text = text.replace(",", "")
            elif "," in text:
                text = text.replace(",", ".")
            return float(text)
        except (ValueError, TypeError):
            return None

    def compare_amounts(
        self, detected: float, expected: float, tolerance: float = 0.0
    ) -> Tuple[bool, float]:
        """Compare detected amount vs expected amount."""
        diff = abs(detected - expected)
        match = diff <= tolerance
        confidence = 1.0 - min(diff / expected, 1.0) if expected > 0 else 0.0
        return match, confidence

    # ─── STEP 3: Verifikasi ──────────────────────────────────────────────────
    def verify_payment(self, notification: dict) -> VerificationResult:
        """Full verification pipeline."""
        order_id = notification["order_id"]
        expected_amount = float(notification["order_amount"])
        image_path = notification["image_path"]

        logger.info(f"{'='*60}")
        logger.info(f"VERIFIKASI DIMULAI | Order: {order_id}")
        logger.info(f"{'='*60}")

        # 1. Load image
        img = self.load_image(image_path)
        if img is None:
            return VerificationResult(
                status="ESCALATED",
                order_id=order_id,
                expected_amount=expected_amount,
                method="NONE",
                reason="Gambar bukti pembayaran tidak dapat dimuat",
                confidence=0.0,
            )

        # 2. Try barcode/QR
        barcode_data, barcode_conf, barcode_method = self.read_barcode(img)
        detected_amount = None
        method = "NONE"

        if barcode_data:
            detected_amount = self.extract_amount_from_barcode(barcode_data)
            method = barcode_method

        # 3. Fallback to OCR if barcode fails
        if detected_amount is None:
            ocr_text, ocr_conf = self.extract_text_ocr(img)
            if ocr_text:
                detected_amount = self.extract_amount_from_text(ocr_text)
                method = "OCR"
                barcode_conf = ocr_conf

        # 4. Decision
        if detected_amount is None:
            return VerificationResult(
                status="ESCALATED",
                order_id=order_id,
                expected_amount=expected_amount,
                method=method,
                reason="Tidak dapat mendeteksi nominal dari bukti pembayaran. Gambar tidak jelas atau format tidak didukung.",
                confidence=0.0,
            )

        match, conf = self.compare_amounts(detected_amount, expected_amount)

        if match and conf >= 0.95:
            logger.info(f"✅ ORDER APPROVED | Order: {order_id} | "
                         f"Detected: Rp {detected_amount:,.0f} | "
                         f"Expected: Rp {expected_amount:,.0f} | Method: {method}")
            return VerificationResult(
                status="ACCEPTED",
                order_id=order_id,
                detected_amount=detected_amount,
                expected_amount=expected_amount,
                method=method,
                reason=f"Nominal sesuai: Rp {detected_amount:,.0f}",
                confidence=conf,
            )
        elif not match:
            logger.warning(f"❌ ORDER REJECTED | Order: {order_id} | "
                            f"Detected: Rp {detected_amount:,.0f} | "
                            f"Expected: Rp {expected_amount:,.0f} | Method: {method}")
            return VerificationResult(
                status="REJECTED",
                order_id=order_id,
                detected_amount=detected_amount,
                expected_amount=expected_amount,
                method=method,
                reason=f"Nominal tidak sesuai: terdeteksi Rp {detected_amount:,.0f}, "
                       f"diharapkan Rp {expected_amount:,.0f}",
                confidence=conf,
            )
        else:
            logger.warning(f"⚠️ ORDER ESCALATED | Order: {order_id} | "
                            f"Detected: Rp {detected_amount:,.0f} | "
                            f"Expected: Rp {expected_amount:,.0f} | Confidence: {conf:.2f}")
            return VerificationResult(
                status="ESCALATED",
                order_id=order_id,
                detected_amount=detected_amount,
                expected_amount=expected_amount,
                method=method,
                reason=f"Keyakinan rendah ({conf:.0%}). Detected: Rp {detected_amount:,.0f}",
                confidence=conf,
            )

    # ─── Full Pipeline ────────────────────────────────────────────────────────
    def run_full_verification(self, notification: dict) -> dict:
        """Run complete verification workflow from notification to decision."""
        try:
            self.receive_notification(notification)
            result = self.verify_payment(notification)

            log_entry = (
                f"ORDER {result.status} | Order: {result.order_id} | "
                f"Amount: Rp {result.detected_amount or 0:,.0f} | "
                f"Method: {result.method}"
            )
            logger.info(log_entry)

            return result.to_dict()

        except Exception as e:
            logger.error(f"VERIFIKASI GAGAL | Error: {e}")
            return VerificationResult(
                status="ESCALATED",
                order_id=notification.get("order_id", "UNKNOWN"),
                reason=f"Error sistem: {str(e)}",
                confidence=0.0,
            ).to_dict()


# ─── CLI Entry Point ──────────────────────────────────────────────────────────
def main():
    """CLI entry point. Accepts JSON input via stdin or file argument."""
    import sys

    if len(sys.argv) > 1:
        with open(sys.argv[1], "r") as f:
            notification = json.load(f)
    else:
        notification = json.loads(sys.stdin.read())

    bot = PaymentVerificationBot()
    result = bot.run_full_verification(notification)
    print(result.to_json())


if __name__ == "__main__":
    main()
