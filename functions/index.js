const cycleManager = require("./cycleManager");

// Export all Firebase Cloud Functions
exports.checkCycleScheduled = cycleManager.checkCycleScheduled;
exports.checkCycleManual = cycleManager.checkCycleManual;
exports.forceAllocate = cycleManager.forceAllocate;
