//CHECKSUM:5ae7067da92217ef2f14574178dc7a1bc3fdfe806ad086cb50f4983daadd0e40
"use strict";

/**
 * Wait for a bit.
 *
 * @title Wait/Delay
 * @category Utility
 * @author Botpress, Inc.
 * @param {number} delay=1000 - The number of milliseconds to wait
 */
const wait = async delay => {
  return new Promise(resolve => setTimeout(() => resolve(), delay));
};

return wait(args.delay || 1000);