import { describe, it, expect } from 'vitest';
import { detectCarrier } from './carrierDetector';

describe('Carrier Detection Engine', () => {
  it('detects Israel Post tracking numbers with IL suffix', () => {
    const res = detectCarrier('RS948219481IL');
    expect(res.carrierId).toBe('israel-post');
    expect(res.confidence).toBe('high');
  });

  it('detects Cainiao / AliExpress tracking numbers', () => {
    const res1 = detectCarrier('LP00582910482CN');
    expect(res1.carrierId).toBe('cainiao');

    const res2 = detectCarrier('CAINIAO123456789');
    expect(res2.carrierId).toBe('cainiao');
  });

  it('detects 4PX tracking numbers', () => {
    const res = detectCarrier('4PX30004928194');
    expect(res.carrierId).toBe('4px');
  });

  it('detects UPS 1Z tracking numbers', () => {
    const res = detectCarrier('1Z9999999999999999');
    expect(res.carrierId).toBe('ups');
  });

  it('detects Yanwen tracking numbers', () => {
    const res = detectCarrier('UY894729184YP');
    expect(res.carrierId).toBe('yanwen');
  });

  it('detects DHL 10-digit tracking numbers', () => {
    const res = detectCarrier('4829104821');
    expect(res.carrierId).toBe('dhl');
  });

  it('detects FedEx 12-digit tracking numbers', () => {
    const res = detectCarrier('784920194821');
    expect(res.carrierId).toBe('fedex');
  });

  it('detects Chita Delivery tracking numbers', () => {
    const res = detectCarrier('CH10849201');
    expect(res.carrierId).toBe('chita');
    expect(res.confidence).toBe('high');
  });

  it('detects HFD Delivery tracking numbers', () => {
    const res = detectCarrier('HFD90481029');
    expect(res.carrierId).toBe('hfd');
    expect(res.confidence).toBe('high');
  });

  it('detects BoxIt tracking numbers', () => {
    const res = detectCarrier('BOX920194');
    expect(res.carrierId).toBe('boxit');
    expect(res.confidence).toBe('high');
  });

  it('detects YunExpress tracking numbers', () => {
    const res = detectCarrier('YT2109849201948201');
    expect(res.carrierId).toBe('yunexpress');
    expect(res.confidence).toBe('high');
  });

  it('detects USPS tracking numbers', () => {
    const res = detectCarrier('9400100000000000000000');
    expect(res.carrierId).toBe('usps');
    expect(res.confidence).toBe('high');
  });

  it('detects Royal Mail tracking numbers', () => {
    const res = detectCarrier('RN123456789GB');
    expect(res.carrierId).toBe('royal-mail');
    expect(res.confidence).toBe('high');
  });

  it('returns other with none confidence for unknown format', () => {
    const res = detectCarrier('UNKNOWN_XYZ_999');
    expect(res.carrierId).toBe('other');
    expect(res.confidence).toBe('none');
  });
});

