"""Backend tests for OCR Manuscrit API"""
import pytest
import requests
import os
import base64
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Create a simple test image with PIL
def create_test_image():
    try:
        from PIL import Image, ImageDraw, ImageFont
        img = Image.new('RGB', (400, 200), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        draw.text((20, 30), "Nom;Prenom", fill=(0, 0, 0))
        draw.text((20, 70), "Jean;Dupont", fill=(0, 0, 0))
        draw.text((20, 110), "Marie;Martin", fill=(0, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return buf.read()
    except Exception as e:
        # fallback: minimal PNG
        import struct, zlib
        def make_png(w, h):
            def chunk(name, data):
                c = struct.pack('>I', len(data)) + name + data
                return c + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
            ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
            raw = b''
            for y in range(h):
                raw += b'\x00'
                for x in range(w):
                    v = 200 if (x + y) % 20 < 10 else 100
                    raw += bytes([v, v, v])
            compressed = zlib.compress(raw)
            return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')
        return make_png(100, 50)


TEST_IMAGE_BYTES = create_test_image()
CREATED_IDS = []


class TestHealthCheck:
    """Health check tests"""

    def test_root_returns_200(self):
        res = requests.get(f"{BASE_URL}/api/")
        assert res.status_code == 200

    def test_root_message(self):
        res = requests.get(f"{BASE_URL}/api/")
        data = res.json()
        assert "OCR Manuscrit API" in data.get("message", "")


class TestHistory:
    """History endpoint tests"""

    def test_get_history_returns_list(self):
        res = requests.get(f"{BASE_URL}/api/history")
        assert res.status_code == 200
        assert isinstance(res.json(), list)


class TestTranscribe:
    """Transcription endpoint tests"""

    def test_transcribe_gpt4o(self):
        files = {'file': ('test.png', TEST_IMAGE_BYTES, 'image/png')}
        data = {'model': 'gpt-4o'}
        res = requests.post(f"{BASE_URL}/api/transcribe", files=files, data=data, timeout=60)
        assert res.status_code == 200
        body = res.json()
        assert "csv_content" in body
        assert len(body["csv_content"]) > 0
        assert "id" in body
        CREATED_IDS.append(body["id"])

    def test_transcribe_claude(self):
        files = {'file': ('test.png', TEST_IMAGE_BYTES, 'image/png')}
        data = {'model': 'claude-sonnet-4-6'}
        res = requests.post(f"{BASE_URL}/api/transcribe", files=files, data=data, timeout=60)
        assert res.status_code == 200
        body = res.json()
        assert "csv_content" in body
        assert len(body["csv_content"]) > 0
        assert "id" in body
        CREATED_IDS.append(body["id"])

    def test_transcribe_unknown_model_returns_400(self):
        files = {'file': ('test.png', TEST_IMAGE_BYTES, 'image/png')}
        data = {'model': 'unknown-model'}
        res = requests.post(f"{BASE_URL}/api/transcribe", files=files, data=data, timeout=30)
        assert res.status_code == 400

    def test_transcribe_invalid_format_returns_400(self):
        files = {'file': ('test.txt', b'hello world', 'text/plain')}
        data = {'model': 'gpt-4o'}
        res = requests.post(f"{BASE_URL}/api/transcribe", files=files, data=data, timeout=30)
        assert res.status_code == 400

    def test_history_contains_record_after_transcription(self):
        if not CREATED_IDS:
            pytest.skip("No transcription IDs available")
        res = requests.get(f"{BASE_URL}/api/history")
        assert res.status_code == 200
        ids = [r["id"] for r in res.json()]
        assert CREATED_IDS[0] in ids


class TestDeleteHistory:
    """Delete history tests"""

    def test_delete_existing_record(self):
        # Create a record first
        files = {'file': ('del_test.png', TEST_IMAGE_BYTES, 'image/png')}
        data = {'model': 'gpt-4o'}
        create_res = requests.post(f"{BASE_URL}/api/transcribe", files=files, data=data, timeout=60)
        assert create_res.status_code == 200
        record_id = create_res.json()["id"]

        # Delete it
        del_res = requests.delete(f"{BASE_URL}/api/history/{record_id}")
        assert del_res.status_code == 200
        assert del_res.json().get("success") == True

        # Verify it's gone
        history_res = requests.get(f"{BASE_URL}/api/history")
        ids = [r["id"] for r in history_res.json()]
        assert record_id not in ids

    def test_delete_nonexistent_returns_404(self):
        res = requests.delete(f"{BASE_URL}/api/history/nonexistent-id-xyz")
        assert res.status_code == 404
