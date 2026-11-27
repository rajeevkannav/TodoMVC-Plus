import { vi } from 'vitest';

if (typeof String.prototype.isWellFormed !== 'function') {
  String.prototype.isWellFormed = function() {
    return !/[\uD800-\uDFFF]/.test(this as string);
  };
}