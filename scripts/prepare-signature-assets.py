"""Losslessly recover the identical signature from approved blank masters.
No rotation, cropping, recoloring, resampling or real-client document processing.
Requires Pillow and pypdf; run from repository root.
"""
from pathlib import Path
import hashlib
import zlib
from pypdf import PdfReader

masters = sorted(Path('assets/document-templates').glob('*.pdf'))
images = []
for path in masters:
    for image in PdfReader(path).pages[0].images:
        if image.image.size == (1229, 484):
            images.append(image)
assert len(images) == len(masters) == 2, 'Both blank approved masters must contain the signature'
assert len({hashlib.sha256(image.data).hexdigest() for image in images}) == 1
image = images[0]
assert image.image.mode == 'RGBA'
assert hashlib.sha256(image.data).hexdigest() == 'fdf409258ba55ce0183146192444fe4c0af4faaeccee3698f0e6fdced10b42cd'
assets = Path('assets/documents')
(assets / 'andrii-signature-left-90.png').write_bytes(image.data)
(assets / 'signature-rgb.deflate').write_bytes(zlib.compress(image.image.convert('RGB').tobytes(), 9))
(assets / 'signature-alpha.deflate').write_bytes(zlib.compress(image.image.getchannel('A').tobytes(), 9))
print('Recovered approved original signature pixels and lossless PDF streams.')
