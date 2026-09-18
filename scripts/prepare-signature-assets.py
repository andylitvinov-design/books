"""Encode the approved PNG signature as lossless PDF image/mask streams.
No rotation, cropping, recoloring, resampling or real-client document processing.
Requires Pillow and pypdf; run from repository root.
"""
from pathlib import Path
import hashlib
import zlib
from pypdf import PdfReader
from PIL import Image

masters = sorted(Path('assets/document-templates').glob('*.pdf'))
images = []
for path in masters:
    for image in PdfReader(path).pages[0].images:
        if image.image.size == (1229, 484):
            images.append(image)
assert len(images) == len(masters) == 2, 'Both blank approved masters must contain the signature'
assert len({hashlib.sha256(image.data).hexdigest() for image in images}) == 1
assets = Path('assets/documents')
source = assets / 'andrii-signature-left-90.png'
assert hashlib.sha256(source.read_bytes()).hexdigest() == '9f34fc3bbf3db3c73b1abf61ea3174b7e71cb2b4b66d4e484339a402104f7c6d'
image = Image.open(source)
assert image.mode == 'RGBA' and image.size == (1229, 484)
assert all(master.image.convert('RGBA').tobytes() == image.tobytes() for master in images)
(assets / 'signature-rgb.deflate').write_bytes(zlib.compress(image.convert('RGB').tobytes(), 9))
(assets / 'signature-alpha.deflate').write_bytes(zlib.compress(image.getchannel('A').tobytes(), 9))
print('Verified approved PNG against both masters and encoded lossless PDF streams.')
