import mongoose from "mongoose";

const RuleNodeSchema = new mongoose.Schema({
  type: { type: String, required: true }, // "operator" or "comparison"
  operator: { type: String }, // AND, OR, <, >, etc.
  field: { type: String }, // Field like "age", "salary", etc.
  value: { type: mongoose.Schema.Types.Mixed }, // Can be string or number
  left: { type: mongoose.Schema.Types.Mixed, default: null }, // Store nested rule
  right: { type: mongoose.Schema.Types.Mixed, default: null }, // Store nested rule
  ruleName: { type: String }, // Name of the rule
  ruleString: { type: String }, // Original rule string
  createdAt: { type: Date, default: Date.now }, // Timestamp
});

const RuleNode = mongoose.model("RuleNode", RuleNodeSchema);

export default RuleNode;
