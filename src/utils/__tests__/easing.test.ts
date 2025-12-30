import { describe, it, expect } from 'vitest';
import { Easing, applyEasing } from '../Easing';

describe('Easing Functions', () => {
  describe('linear', () => {
    it('should return t unchanged', () => {
      expect(Easing.linear(0)).toBe(0);
      expect(Easing.linear(0.5)).toBe(0.5);
      expect(Easing.linear(1)).toBe(1);
    });
  });

  describe('easeInOutQuad', () => {
    it('should return 0 at t=0', () => {
      expect(Easing.easeInOutQuad(0)).toBe(0);
    });

    it('should return 1 at t=1', () => {
      expect(Easing.easeInOutQuad(1)).toBe(1);
    });

    it('should return 0.5 at t=0.5', () => {
      expect(Easing.easeInOutQuad(0.5)).toBe(0.5);
    });

    it('should ease in for first half', () => {
      // At t=0.25, should be less than 0.25 (accelerating)
      expect(Easing.easeInOutQuad(0.25)).toBeLessThan(0.25);
    });

    it('should ease out for second half', () => {
      // At t=0.75, should be greater than 0.75 (decelerating)
      expect(Easing.easeInOutQuad(0.75)).toBeGreaterThan(0.75);
    });
  });

  describe('easeOutBack', () => {
    it('should return 0 at t=0', () => {
      expect(Easing.easeOutBack(0)).toBeCloseTo(0, 5);
    });

    it('should return 1 at t=1', () => {
      expect(Easing.easeOutBack(1)).toBe(1);
    });

    it('should overshoot in the middle', () => {
      // easeOutBack overshoots past 1 before settling
      const midValue = Easing.easeOutBack(0.7);
      expect(midValue).toBeGreaterThan(1);
    });
  });

  describe('easeOutElastic', () => {
    it('should return 0 at t=0', () => {
      expect(Easing.easeOutElastic(0)).toBe(0);
    });

    it('should return 1 at t=1', () => {
      expect(Easing.easeOutElastic(1)).toBe(1);
    });

    it('should oscillate around 1', () => {
      // The elastic function should cross 1 multiple times
      const value1 = Easing.easeOutElastic(0.3);
      const value2 = Easing.easeOutElastic(0.5);
      // One of these should be above 1, one below (or both above due to oscillation)
      const crossesOne = (value1 - 1) * (value2 - 1) < 0 || value1 > 1 || value2 > 1;
      expect(crossesOne).toBe(true);
    });
  });

  describe('easeOutBounce', () => {
    it('should return 0 at t=0', () => {
      expect(Easing.easeOutBounce(0)).toBe(0);
    });

    it('should return 1 at t=1', () => {
      expect(Easing.easeOutBounce(1)).toBeCloseTo(1, 5);
    });

    it('should never exceed 1', () => {
      for (let t = 0; t <= 1; t += 0.1) {
        expect(Easing.easeOutBounce(t)).toBeLessThanOrEqual(1);
      }
    });

    it('should always be non-negative', () => {
      for (let t = 0; t <= 1; t += 0.1) {
        expect(Easing.easeOutBounce(t)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('easeInQuad', () => {
    it('should return 0 at t=0', () => {
      expect(Easing.easeInQuad(0)).toBe(0);
    });

    it('should return 1 at t=1', () => {
      expect(Easing.easeInQuad(1)).toBe(1);
    });

    it('should return t^2', () => {
      expect(Easing.easeInQuad(0.5)).toBe(0.25);
    });
  });

  describe('easeOutQuad', () => {
    it('should return 0 at t=0', () => {
      expect(Easing.easeOutQuad(0)).toBe(0);
    });

    it('should return 1 at t=1', () => {
      expect(Easing.easeOutQuad(1)).toBe(1);
    });

    it('should be faster initially than linear', () => {
      expect(Easing.easeOutQuad(0.25)).toBeGreaterThan(0.25);
    });
  });
});

describe('applyEasing', () => {
  it('should interpolate between start and end values', () => {
    const result = applyEasing(Easing.linear, 0, 100, 0.5);
    expect(result).toBe(50);
  });

  it('should return start value at progress 0', () => {
    const result = applyEasing(Easing.easeInOutQuad, 10, 50, 0);
    expect(result).toBe(10);
  });

  it('should return end value at progress 1', () => {
    const result = applyEasing(Easing.easeInOutQuad, 10, 50, 1);
    expect(result).toBe(50);
  });

  it('should clamp progress below 0', () => {
    const result = applyEasing(Easing.linear, 0, 100, -0.5);
    expect(result).toBe(0);
  });

  it('should clamp progress above 1', () => {
    const result = applyEasing(Easing.linear, 0, 100, 1.5);
    expect(result).toBe(100);
  });

  it('should work with negative ranges', () => {
    const result = applyEasing(Easing.linear, 100, 0, 0.5);
    expect(result).toBe(50);
  });

  it('should apply easing function to progress', () => {
    const linear = applyEasing(Easing.linear, 0, 100, 0.25);
    const eased = applyEasing(Easing.easeInQuad, 0, 100, 0.25);
    // easeInQuad(0.25) = 0.0625, so result should be 6.25
    expect(linear).toBe(25);
    expect(eased).toBe(6.25);
  });
});
