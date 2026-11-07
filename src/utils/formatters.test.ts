import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCoordinates,
  formatDateTime,
  lonToTileX,
  latToTileY,
  degreesToCompass,
  formatBearing,
  parseAddressHierarchy,
} from './formatters';

test('formatCoordinates outputs exact GPS camera format with degrees', () => {
  const result = formatCoordinates(10.690836, 122.485223);
  assert.equal(result, 'Lat 10.690836°  Long 122.485223°');
});

test('formatCoordinates handles negative coordinates (S/W)', () => {
  const result = formatCoordinates(-33.86882, -151.209295);
  assert.equal(result, 'Lat -33.868820°  Long -151.209295°');
});

test('formatDateTime outputs MM/DD/YY hh:mm AM/PM', () => {
  // Test with fixed ISO string
  const fixedDate = new Date(2025, 6, 24, 10, 15, 0); // July 24, 2025 10:15 AM
  const formatted = formatDateTime(fixedDate);
  assert.equal(formatted, '07/24/25  10:15 AM');
});

test('lonToTileX and latToTileY compute valid Mercator coordinates', () => {
  const zoom = 16;
  const tileX = lonToTileX(122.485223, zoom);
  const tileY = latToTileY(10.690836, zoom);

  assert.ok(tileX > 0 && tileX < Math.pow(2, zoom));
  assert.ok(tileY > 0 && tileY < Math.pow(2, zoom));
  assert.equal(Math.floor(tileX), 55065);
});

test('degreesToCompass and formatBearing return correct directions', () => {
  assert.equal(degreesToCompass(0), 'N');
  assert.equal(degreesToCompass(90), 'E');
  assert.equal(degreesToCompass(135), 'SE');
  assert.equal(degreesToCompass(142), 'SE');
  assert.equal(formatBearing(142), '142° SE');
  assert.equal(formatBearing(270), '270° W');
});

test('parseAddressHierarchy creates structured title and full address', () => {
  const sample = {
    road: 'Iloilo R-1 Road',
    suburb: 'Poblacion North',
    municipality: 'Oton',
    province: 'Iloilo',
    postcode: '5020',
    country: 'Philippines',
  };

  const parsed = parseAddressHierarchy(sample);
  assert.equal(parsed.title, 'Oton, Iloilo, Philippines');
  assert.equal(
    parsed.address,
    'Iloilo R-1 Road, Poblacion North, Oton, Iloilo, 5020, Philippines'
  );
});
