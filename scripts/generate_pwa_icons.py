import zlib
import struct
import os

def create_png(width, height, draw_func, filename):
    # Prepare RGBA pixel buffer
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # filter byte: None
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw_data), level=9)
    
    # PNG signature
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png.extend(struct.pack('>I', len(ihdr_data)))
    png.extend(b'IHDR')
    png.extend(ihdr_data)
    png.extend(struct.pack('>I', ihdr_crc))
    
    # IDAT chunk
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png.extend(struct.pack('>I', len(compressed)))
    png.extend(b'IDAT')
    png.extend(compressed)
    png.extend(struct.pack('>I', idat_crc))
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    png.extend(struct.pack('>I', 0))
    png.extend(b'IEND')
    png.extend(struct.pack('>I', iend_crc))
    
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(png)
    print(f"Generated {filename} ({width}x{height})")

def pwa_drawer(x, y, w, h, is_maskable=False):
    # Normalized coords 0.0 to 1.0
    nx = x / float(w)
    ny = y / float(h)
    
    # Background: Navy #002B49 gradient to #00172A
    base_r, base_g, base_b = int(0 * (1 - ny) + 0 * ny), int(43 * (1 - ny) + 23 * ny), int(73 * (1 - ny) + 42 * ny)
    
    # Rounded corner mask for regular icon (not maskable)
    if not is_maskable:
        # Check corner radius
        corner_r = 0.22
        dx, dy = 0, 0
        if nx < corner_r and ny < corner_r:
            dx, dy = corner_r - nx, corner_r - ny
        elif nx > (1 - corner_r) and ny < corner_r:
            dx, dy = nx - (1 - corner_r), corner_r - ny
        elif nx < corner_r and ny > (1 - corner_r):
            dx, dy = corner_r - nx, ny - (1 - corner_r)
        elif nx > (1 - corner_r) and ny > (1 - corner_r):
            dx, dy = nx - (1 - corner_r), ny - (1 - corner_r)
        
        if (dx*dx + dy*dy) > (corner_r * corner_r):
            return (0, 0, 0, 0) # transparent outer corner
            
    # Center Gold Real Estate Logo
    # Main Tower
    is_gold = False
    
    # Central building coordinates
    bx1, bx2 = 0.35, 0.65
    by1, by2 = 0.28, 0.68
    
    # Triangular roof
    if 0.18 <= ny <= 0.28:
        progress = (ny - 0.18) / 0.10
        half_w = 0.16 * progress
        if 0.50 - half_w <= nx <= 0.50 + half_w:
            is_gold = True
            
    # Main tower body
    if by1 <= ny <= by2 and bx1 <= nx <= bx2:
        is_gold = True
        
    # Side wings
    if 0.40 <= ny <= by2 and 0.24 <= nx <= bx1:
        is_gold = True
    if 0.36 <= ny <= by2 and bx2 <= nx <= 0.76:
        is_gold = True
        
    # Windows in navy
    is_window = False
    if is_gold:
        # Left wing windows
        if 0.45 <= ny <= 0.52 and 0.27 <= nx <= 0.32: is_window = True
        if 0.56 <= ny <= 0.63 and 0.27 <= nx <= 0.32: is_window = True
        # Right wing windows
        if 0.42 <= ny <= 0.49 and 0.68 <= nx <= 0.73: is_window = True
        if 0.53 <= ny <= 0.60 and 0.68 <= nx <= 0.73: is_window = True
        # Main tower windows
        if 0.33 <= ny <= 0.41 and (0.39 <= nx <= 0.46 or 0.54 <= nx <= 0.61): is_window = True
        if 0.45 <= ny <= 0.53 and (0.39 <= nx <= 0.46 or 0.54 <= nx <= 0.61): is_window = True
        # Center door arch
        if 0.57 <= ny <= by2 and 0.44 <= nx <= 0.56:
            is_window = True

    # Bottom Gold Badge: "أسيوط"
    if 0.73 <= ny <= 0.83 and 0.30 <= nx <= 0.70:
        badge_r = 0.05
        # rounded capsule
        if nx < 0.30 + badge_r:
            d = ((0.30 + badge_r - nx)**2 + (0.78 - ny)**2)**0.5
            if d <= badge_r: is_gold = True
        elif nx > 0.70 - badge_r:
            d = ((nx - (0.70 - badge_r))**2 + (0.78 - ny)**2)**0.5
            if d <= badge_r: is_gold = True
        else:
            is_gold = True
            
    if is_window:
        return (0, 43, 73, 255) # Navy window
    elif is_gold:
        return (255, 179, 0, 255) # Gold #FFB300
    else:
        # Subtle border ring
        if not is_maskable and (nx < 0.03 or nx > 0.97 or ny < 0.03 or ny > 0.97):
            return (255, 179, 0, 70)
        return (base_r, base_g, base_b, 255)

# Generate assets
create_png(192, 192, lambda x, y, w, h: pwa_drawer(x, y, w, h, False), "public/icons/icon-192x192.png")
create_png(512, 512, lambda x, y, w, h: pwa_drawer(x, y, w, h, False), "public/icons/icon-512x512.png")
create_png(512, 512, lambda x, y, w, h: pwa_drawer(x, y, w, h, True), "public/icons/icon-maskable-512x512.png")
create_png(180, 180, lambda x, y, w, h: pwa_drawer(x, y, w, h, False), "public/apple-touch-icon.png")
print("All PWA PNG icons generated successfully!")
