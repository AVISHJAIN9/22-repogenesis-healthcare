const mongoose = require('mongoose');

const ruleConditionSchema = new mongoose.Schema({
  field: { type: String, required: true, trim: true },
  operator: { type: String, required: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, trim: true, default: '' }
}, { _id: false });

const contraindicationRuleSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['allergy', 'comorbidity', 'medication', 'lab', 'vital', 'therapy'],
    required: true,
    index: true
  },
  severity: { type: String, enum: ['info', 'warning', 'hard'], default: 'warning', index: true },
  therapy: { type: String, trim: true, default: '' },
  conditions: [ruleConditionSchema],
  message: { type: String, required: true, trim: true },
  recommendation: { type: String, trim: true, default: '' },
  active: { type: Boolean, default: true, index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'contraindication_rules' });

contraindicationRuleSchema.index({ tenantId: 1, category: 1, active: 1 });

module.exports = mongoose.model('ContraindicationRule', contraindicationRuleSchema);
